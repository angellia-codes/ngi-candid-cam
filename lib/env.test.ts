import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const valid: Record<string, string | undefined> = {
  GOOGLE_SA_EMAIL: 'candid-cam@ngi-nf26.iam.gserviceaccount.com',
  GOOGLE_SA_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
  DRIVE_SHARED_DRIVE_ID: '0ABC',
  DRIVE_FOLDER_ID: '1XYZ',
  EVENT_KEY: 'k'.repeat(24),
  CAMERA_OPEN_AT: '2026-12-08T15:00:00+08:00',
  CAMERA_CLOSE_AT: '2026-12-08T23:00:00+08:00',
  UPLOAD_CLOSE_AT: '2026-12-09T12:00:00+08:00',
  SHOTS_PER_DEVICE: '15',
  DEVICE_UPLOAD_CAP: '20',
  MAX_UPLOAD_BYTES: '3000000',
  CONSENT_VERSION: '2026-10-v1',
  HEALTH_CHECK_TOKEN: 'h'.repeat(24),
};

describe('parseEnv', () => {
  it('parses a complete environment', () => {
    const e = parseEnv(valid);
    expect(e.shotsPerDevice).toBe(15);
    expect(e.deviceUploadCap).toBe(20);
    expect(e.cameraOpenAt.toISOString()).toBe('2026-12-08T07:00:00.000Z');
    expect(e.googleSaPrivateKey).toContain('\nabc\n');
  });

  it('names every missing variable', () => {
    expect(() => parseEnv({ ...valid, EVENT_KEY: '', DRIVE_FOLDER_ID: undefined })).toThrow(
      'Missing environment variables: DRIVE_FOLDER_ID, EVENT_KEY',
    );
  });

  it('rejects a malformed date', () => {
    expect(() => parseEnv({ ...valid, CAMERA_OPEN_AT: '8 Dec' })).toThrow('CAMERA_OPEN_AT is not a valid ISO date-time');
  });

  it('rejects a non-integer number', () => {
    expect(() => parseEnv({ ...valid, SHOTS_PER_DEVICE: '15.5' })).toThrow('SHOTS_PER_DEVICE must be a positive integer');
  });

  it('rejects times in the wrong order', () => {
    expect(() => parseEnv({ ...valid, CAMERA_CLOSE_AT: '2026-12-09T13:00:00+08:00' })).toThrow(
      'Expected CAMERA_OPEN_AT < CAMERA_CLOSE_AT <= UPLOAD_CLOSE_AT',
    );
  });

  it('rejects short secrets', () => {
    expect(() => parseEnv({ ...valid, EVENT_KEY: 'short' })).toThrow('EVENT_KEY must be at least 16 characters');
  });
});
