import 'server-only';
import type { ServerEnv } from '@/lib/env';
import { DriveError, createPhoto, listDevicePhotos, type DriveDeps } from '@/lib/drive/files';
import { EXPECTED_HEIGHT, EXPECTED_WIDTH, inspectJpeg } from '@/lib/security/validateImage';
import { isValidEventKey, isWithinUploadWindow } from '@/lib/security/eventGuard';
import { COOKIE_DEVICE, COOKIE_KEY, parseCookieString } from '@/lib/shared/cookies';
import { formatFileName } from '@/lib/shared/time';

export type UploadDeps = {
  env: ServerEnv;
  drive: DriveDeps;
  now: () => Date;
  log?: (entry: Record<string, unknown>) => void;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORM_OVERHEAD_BYTES = 64 * 1024;
const DRIVE_BUDGET_MS = 8_000;
const NO_STORE = { 'cache-control': 'no-store' };

const fail = (status: number, code: string) => Response.json({ ok: false, code }, { status, headers: NO_STORE });
const ok = (body: Record<string, unknown>) => Response.json({ ok: true, ...body }, { status: 200, headers: NO_STORE });

const defaultLog = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry));

export async function handleUpload(req: Request, deps: UploadDeps): Promise<Response> {
  const started = Date.now();
  // eslint-disable-next-line prefer-const -- read by `finish` before it is set; const would hit the TDZ
  let photoId: string | undefined;
  let bytes = 0;
  const finish = (res: Response, result: string) => {
    (deps.log ?? defaultLog)({ evt: 'upload', photoId, result, status: res.status, bytes, ms: Date.now() - started });
    return res;
  };

  const { env } = deps;
  const cookies = parseCookieString(req.headers.get('cookie'));

  if (!isValidEventKey(cookies[COOKIE_KEY], env.eventKey)) return finish(fail(401, 'bad_key'), 'bad_key');
  if (!isWithinUploadWindow(deps.now(), env)) return finish(fail(403, 'window_closed'), 'window_closed');

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > env.maxUploadBytes + FORM_OVERHEAD_BYTES) return finish(fail(413, 'too_large'), 'too_large');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return finish(fail(400, 'bad_request'), 'bad_request');
  }

  if (form.get('consentVersion') !== env.consentVersion) return finish(fail(400, 'consent_required'), 'consent_required');

  const pid = form.get('photoId');
  const captured = form.get('capturedAt');
  const image = form.get('image');
  if (
    typeof pid !== 'string' ||
    !UUID_RE.test(pid) ||
    typeof captured !== 'string' ||
    Number.isNaN(Date.parse(captured)) ||
    !(image instanceof Blob)
  ) {
    return finish(fail(400, 'bad_request'), 'bad_request');
  }
  photoId = pid;
  bytes = image.size;

  if (image.size > env.maxUploadBytes) return finish(fail(413, 'too_large'), 'too_large');

  const data = new Uint8Array(await image.arrayBuffer());
  const size = inspectJpeg(data);
  if (!size || size.width !== EXPECTED_WIDTH || size.height !== EXPECTED_HEIGHT) {
    return finish(fail(415, 'bad_type'), 'bad_type');
  }

  const deviceId = cookies[COOKIE_DEVICE];
  if (!deviceId || !UUID_RE.test(deviceId)) return finish(fail(400, 'no_device'), 'no_device');

  const signal = AbortSignal.timeout(DRIVE_BUDGET_MS);
  try {
    const stored = await listDevicePhotos(deps.drive, deviceId, signal);
    if (stored.includes(pid)) return finish(ok({ photoId: pid, duplicate: true }), 'duplicate');
    if (stored.length >= env.deviceUploadCap) return finish(fail(429, 'device_cap'), 'device_cap');

    const capturedAt = new Date(captured);
    await createPhoto(
      deps.drive,
      {
        name: formatFileName(capturedAt, pid),
        bytes: data,
        appProperties: {
          app: 'nf26-candid-cam',
          photoId: pid,
          deviceId,
          capturedAt: capturedAt.toISOString(),
          consentVersion: env.consentVersion,
        },
      },
      signal,
    );
    return finish(ok({ photoId: pid, uploadedAt: deps.now().toISOString() }), 'saved');
  } catch (err) {
    const reason = err instanceof DriveError ? err.code : 'unknown';
    return finish(fail(503, 'drive_unavailable'), `drive_unavailable:${reason}`);
  }
}
