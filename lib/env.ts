import 'server-only';

export type ServerEnv = {
  googleSaEmail: string;
  googleSaPrivateKey: string;
  driveSharedDriveId: string;
  driveFolderId: string;
  eventKey: string;
  cameraOpenAt: Date;
  cameraCloseAt: Date;
  uploadCloseAt: Date;
  shotsPerDevice: number;
  deviceUploadCap: number;
  maxUploadBytes: number;
  consentVersion: string;
  healthCheckToken: string;
};

const REQUIRED = [
  'GOOGLE_SA_EMAIL',
  'GOOGLE_SA_PRIVATE_KEY',
  'DRIVE_SHARED_DRIVE_ID',
  'DRIVE_FOLDER_ID',
  'EVENT_KEY',
  'CAMERA_OPEN_AT',
  'CAMERA_CLOSE_AT',
  'UPLOAD_CLOSE_AT',
  'SHOTS_PER_DEVICE',
  'DEVICE_UPLOAD_CAP',
  'MAX_UPLOAD_BYTES',
  'CONSENT_VERSION',
  'HEALTH_CHECK_TOKEN',
] as const;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

type Source =Record<string, string | undefined>;

export function parseEnv(src: Source): ServerEnv {
  const missing = REQUIRED.filter((k) => !src[k]?.trim());
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

  const str = (k: (typeof REQUIRED)[number]) => src[k]!.trim();
  const date = (k: (typeof REQUIRED)[number]) => {
    // V8's Date also accepts loose strings like "8 Dec", so require ISO 8601 with an explicit offset.
    const d = new Date(str(k));
    if (!ISO_DATE_TIME.test(str(k)) || Number.isNaN(d.getTime())) throw new Error(`${k} is not a valid ISO date-time`);
    return d;
  };
  const int = (k: (typeof REQUIRED)[number]) => {
    const n = Number(str(k));
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${k} must be a positive integer`);
    return n;
  };
  const secret = (k: (typeof REQUIRED)[number]) => {
    const v = str(k);
    if (v.length < 16) throw new Error(`${k} must be at least 16 characters`);
    return v;
  };

  const parsed: ServerEnv = {
    googleSaEmail: str('GOOGLE_SA_EMAIL'),
    // Netlify and .env files store the key on one line with literal "\n".
    googleSaPrivateKey: str('GOOGLE_SA_PRIVATE_KEY').replace(/\\n/g, '\n'),
    driveSharedDriveId: str('DRIVE_SHARED_DRIVE_ID'),
    driveFolderId: str('DRIVE_FOLDER_ID'),
    eventKey: secret('EVENT_KEY'),
    cameraOpenAt: date('CAMERA_OPEN_AT'),
    cameraCloseAt: date('CAMERA_CLOSE_AT'),
    uploadCloseAt: date('UPLOAD_CLOSE_AT'),
    shotsPerDevice: int('SHOTS_PER_DEVICE'),
    deviceUploadCap: int('DEVICE_UPLOAD_CAP'),
    maxUploadBytes: int('MAX_UPLOAD_BYTES'),
    consentVersion: str('CONSENT_VERSION'),
    healthCheckToken: secret('HEALTH_CHECK_TOKEN'),
  };

  if (!(parsed.cameraOpenAt < parsed.cameraCloseAt && parsed.cameraCloseAt <= parsed.uploadCloseAt)) {
    throw new Error('Expected CAMERA_OPEN_AT < CAMERA_CLOSE_AT <= UPLOAD_CLOSE_AT');
  }
  return parsed;
}

let cached: ServerEnv | null = null;

/** Parsed once per server instance; throws a readable error if config is wrong. */
export function env(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
