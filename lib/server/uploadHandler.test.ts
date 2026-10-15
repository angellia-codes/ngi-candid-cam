import { describe, expect, it } from 'vitest';
import type { DriveDeps } from '@/lib/drive/files';
import { handleUpload, type UploadDeps } from '@/lib/server/uploadHandler';
import { fakeJpeg, testEnv } from '@/test/fixtures';

const KEY = 'k'.repeat(24);
const DEVICE = '9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b';
const PHOTO = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const DURING = new Date('2026-12-08T13:00:00Z'); // 21:00 WITA

type Call = { url: string; init?: RequestInit };

function fakeDrive(existing: string[] = [], fail = false): { drive: DriveDeps; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (fail) throw new Error('socket hang up');
    if (url.startsWith('https://www.googleapis.com/upload/')) return Response.json({ id: 'file-1' });
    return Response.json({ files: existing.map((photoId) => ({ appProperties: { photoId } })) });
  }) as typeof fetch;
  return { drive: { fetch: fetchFn, getToken: async () => 'tok', sharedDriveId: '0ABC', folderId: '1XYZ' }, calls };
}

function form(o: Partial<Record<'photoId' | 'capturedAt' | 'consentVersion', string>> = {}, image: Uint8Array = fakeJpeg()) {
  const f = new FormData();
  f.set('photoId', o.photoId ?? PHOTO);
  f.set('capturedAt', o.capturedAt ?? '2026-12-08T11:34:12.000Z');
  f.set('consentVersion', o.consentVersion ?? '2026-10-v1');
  f.set('image', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'x.jpg');
  return f;
}

function request(body: FormData, cookie = `nf26_key=${KEY}; nf26_device=${DEVICE}`) {
  return new Request('https://cam.test/api/upload', { method: 'POST', headers: { cookie }, body });
}

function deps(drive: DriveDeps, over: Partial<UploadDeps> = {}): UploadDeps {
  return { env: testEnv(), drive, now: () => DURING, log: () => {}, ...over };
}

async function code(res: Response) {
  return ((await res.json()) as { code?: string }).code;
}

describe('handleUpload', () => {
  it('saves a valid photo with its metadata', async () => {
    const { drive, calls } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photoId: PHOTO, uploadedAt: DURING.toISOString() });
    const upload = calls.find((c) => c.url.includes('/upload/'))!;
    const body = await (upload.init!.body as Blob).text();
    expect(body).toContain('NF26_20261208-193412_1b9d6bcd.jpg');
    expect(body).toContain(`"deviceId":"${DEVICE}"`);
    expect(body).toContain('"consentVersion":"2026-10-v1"');
  });

  it('rejects a missing or wrong event key', async () => {
    const { drive, calls } = fakeDrive();
    const res = await handleUpload(request(form(), `nf26_device=${DEVICE}`), deps(drive));
    expect(res.status).toBe(401);
    expect(await code(res)).toBe('bad_key');
    expect(calls).toHaveLength(0);
  });

  it('rejects uploads after the window closes', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive, { now: () => new Date('2026-12-09T05:00:00Z') }));
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('window_closed');
  });

  it('asks for consent when the version is outdated', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form({ consentVersion: '2025-old' })), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('consent_required');
  });

  it('rejects a malformed photo ID', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form({ photoId: 'nope' })), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('bad_request');
  });

  it('rejects an image over the size limit', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form()), deps(drive, { env: testEnv({ maxUploadBytes: 20 }) }));
    expect(res.status).toBe(413);
    expect(await code(res)).toBe('too_large');
  });

  it('rejects non-JPEG and wrong-size images', async () => {
    const { drive } = fakeDrive();
    const notJpeg = await handleUpload(request(form({}, new TextEncoder().encode('hello'))), deps(drive));
    expect(notJpeg.status).toBe(415);
    const wrongSize = await handleUpload(request(form({}, fakeJpeg(800, 600))), deps(drive));
    expect(wrongSize.status).toBe(415);
    expect(await code(wrongSize)).toBe('bad_type');
  });

  it('requires the device cookie', async () => {
    const { drive } = fakeDrive();
    const res = await handleUpload(request(form(), `nf26_key=${KEY}`), deps(drive));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('no_device');
  });

  it('treats a repeat of a stored photo as saved without uploading again', async () => {
    const { drive, calls } = fakeDrive([PHOTO]);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, photoId: PHOTO, duplicate: true });
    expect(calls.some((c) => c.url.includes('/upload/'))).toBe(false);
  });

  it('checks for a duplicate before the device cap', async () => {
    const twenty = Array.from({ length: 19 }, (_, i) => `other-${i}`).concat(PHOTO);
    const { drive } = fakeDrive(twenty);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(200);
  });

  it('stops a device at the upload cap', async () => {
    const { drive } = fakeDrive(Array.from({ length: 20 }, (_, i) => `other-${i}`));
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(429);
    expect(await code(res)).toBe('device_cap');
  });

  it('returns a retryable error when Drive fails', async () => {
    const { drive } = fakeDrive([], true);
    const res = await handleUpload(request(form()), deps(drive));
    expect(res.status).toBe(503);
    expect(await code(res)).toBe('drive_unavailable');
  });
});
