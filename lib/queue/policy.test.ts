import { describe, expect, it } from 'vitest';
import {
  PAUSED,
  classifyResponse,
  nextDue,
  pendingCount,
  retryDelayMs,
  shotsUsed,
  type PhotoRecord,
  type PhotoStatus,
} from '@/lib/queue/policy';

const rec = (photoId: string, status: PhotoStatus, createdAt: number, nextAttemptAt = 0): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new ArrayBuffer(4),
  status,
  attempts: 0,
  nextAttemptAt,
});

describe('retryDelayMs', () => {
  it('waits 2, 5, 15, 30 then 60 seconds', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(retryDelayMs)).toEqual([2000, 5000, 15000, 30000, 60000, 60000, 60000]);
  });
});

describe('classifyResponse', () => {
  it('maps server answers to queue outcomes', () => {
    expect(classifyResponse(200)).toEqual({ kind: 'saved' });
    expect(classifyResponse(null)).toEqual({ kind: 'retry', reason: 'network' });
    expect(classifyResponse(503, 'drive_unavailable')).toEqual({ kind: 'retry', reason: 'drive_unavailable' });
    expect(classifyResponse(400, 'consent_required')).toEqual({ kind: 'consent' });
    expect(classifyResponse(429, 'device_cap')).toEqual({ kind: 'rejected', code: 'device_cap' });
    expect(classifyResponse(403)).toEqual({ kind: 'rejected', code: 'http_403' });
  });
});

describe('queue selectors', () => {
  const now = 10_000;
  const records = [
    rec('saved', 'saved', 1),
    rec('later', 'retrying', 2, now + 5000),
    rec('due', 'retrying', 3, now - 1),
    rec('new', 'developing', 4),
    rec('refunded', 'not_sent', 5),
    rec('paused', 'retrying', 6, PAUSED),
  ];

  it('picks the oldest photo that is due', () => {
    expect(nextDue(records, now)?.photoId).toBe('due');
    expect(nextDue([rec('a', 'developing', 9), rec('b', 'developing', 8)].sort((x, y) => x.createdAt - y.createdAt), now)?.photoId).toBe('b');
  });

  it('counts used shots without refunded ones', () => {
    expect(shotsUsed(records)).toBe(5);
  });

  it('counts photos still waiting to reach Drive', () => {
    expect(pendingCount(records)).toBe(4);
  });
});
