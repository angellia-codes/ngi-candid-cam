import { describe, expect, it, vi } from 'vitest';
import { PAUSED, type PhotoRecord, type SendResult } from '@/lib/queue/policy';
import type { PhotoStore } from '@/lib/queue/store';
import { UploadWorker, type WorkerDeps } from '@/lib/queue/worker';

function memoryStore(): PhotoStore {
  const rows = new Map<string, PhotoRecord>();
  return {
    put: async (r) => void rows.set(r.photoId, structuredClone(r)),
    get: async (id) => rows.get(id),
    all: async () => [...rows.values()].sort((a, b) => a.createdAt - b.createdAt),
  };
}

const rec = (photoId: string, createdAt: number, over: Partial<PhotoRecord> = {}): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new ArrayBuffer(4),
  status: 'developing',
  attempts: 0,
  nextAttemptAt: 0,
  ...over,
});

const NOW = 1_000_000;

function setup(responses: SendResult[], over: Partial<WorkerDeps> = {}) {
  const store = memoryStore();
  const sent: string[] = [];
  const queue = [...responses];
  const setTimer = vi.fn(() => 'timer');
  const deps: WorkerDeps = {
    store,
    send: async (r) => {
      sent.push(r.photoId);
      return queue.shift() ?? { status: 200 };
    },
    now: () => NOW,
    uploadCloseAt: NOW + 3_600_000,
    onChange: vi.fn(),
    onConsentRequired: vi.fn(),
    setTimer,
    clearTimer: vi.fn(),
    ...over,
  };
  return { store, sent, deps, setTimer, worker: new UploadWorker(deps) };
}

describe('UploadWorker', () => {
  it('uploads oldest first and marks photos saved', async () => {
    const { store, sent, worker } = setup([{ status: 200 }, { status: 200 }]);
    await store.put(rec('second', 2));
    await store.put(rec('first', 1));
    await worker.kick();
    expect(sent).toEqual(['first', 'second']);
    expect((await store.all()).map((r) => r.status)).toEqual(['saved', 'saved']);
  });

  it('schedules a retry 2 s after a network failure', async () => {
    const { store, worker, setTimer } = setup([{ status: null }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(await store.get('a')).toMatchObject({ status: 'retrying', attempts: 1, nextAttemptAt: NOW + 2000, lastError: 'network' });
    expect(setTimer).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });

  it('marks a rejected photo as not sent, which refunds the shot', async () => {
    const { store, worker } = setup([{ status: 429, code: 'device_cap' }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(await store.get('a')).toMatchObject({ status: 'not_sent', lastError: 'device_cap' });
  });

  it('pauses on consent_required and resumes on retryNow', async () => {
    const { store, worker, deps, sent } = setup([{ status: 400, code: 'consent_required' }, { status: 200 }]);
    await store.put(rec('a', 1));
    await worker.kick();
    expect(deps.onConsentRequired).toHaveBeenCalledOnce();
    expect(await store.get('a')).toMatchObject({ status: 'retrying', nextAttemptAt: PAUSED });
    await worker.retryNow();
    expect(sent).toEqual(['a', 'a']);
    expect((await store.get('a'))!.status).toBe('saved');
  });

  it('gives up without sending once the upload window has closed', async () => {
    const { store, worker, sent } = setup([], { uploadCloseAt: NOW - 1 });
    await store.put(rec('a', 1));
    await worker.kick();
    expect(sent).toEqual([]);
    expect(await store.get('a')).toMatchObject({ status: 'not_sent', lastError: 'window_closed' });
  });

  it('treats a thrown send as a network failure', async () => {
    const { store, worker } = setup([], {
      send: async () => {
        throw new Error('boom');
      },
    });
    await store.put(rec('a', 1));
    await worker.kick();
    expect((await store.get('a'))!.status).toBe('retrying');
  });

  it('recovers photos left mid-send by a closed tab', async () => {
    const { store, worker } = setup([]);
    await store.put(rec('a', 1, { status: 'sending' }));
    await worker.recover();
    expect((await store.get('a'))!.status).toBe('developing');
  });

  it('never runs two uploads at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const { store, worker } = setup([], {
      send: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return { status: 200 };
      },
    });
    await store.put(rec('a', 1));
    await store.put(rec('b', 2));
    await Promise.all([worker.kick(), worker.kick(), worker.kick()]);
    await worker.kick();
    expect(maxInFlight).toBe(1);
    expect((await store.all()).every((r) => r.status === 'saved')).toBe(true);
  });
});
