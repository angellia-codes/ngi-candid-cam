import type { ServerEnv } from '@/lib/env';

export function testEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    googleClientId: 'client-id.apps.googleusercontent.com',
    googleClientSecret: 'client-secret',
    googleRefreshToken: 'refresh-token',
    driveFolderId: '1XYZ',
    eventKey: 'k'.repeat(24),
    cameraOpenAt: new Date('2026-12-08T15:00:00+08:00'),
    cameraCloseAt: new Date('2026-12-08T23:00:00+08:00'),
    uploadCloseAt: new Date('2026-12-09T12:00:00+08:00'),
    shotsPerDevice: 15,
    deviceUploadCap: 20,
    maxUploadBytes: 3_000_000,
    consentVersion: '2026-10-v1',
    healthCheckToken: 'h'.repeat(24),
    ...overrides,
  };
}

/** Minimal JPEG: SOI, APP0, SOF0 with the given size, optional padding, EOI. */
export function fakeJpeg(width = 1320, height = 1920, extra = 0): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof0 = [
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, ...new Array<number>(extra).fill(0), 0xff, 0xd9]);
}
