import { expect, it } from 'vitest';
import { buildStatus } from '@/lib/server/statusHandler';
import { testEnv } from '@/test/fixtures';

it('exposes only public settings', () => {
  const s = buildStatus(testEnv(), new Date('2026-12-08T10:00:00Z'));
  expect(s).toEqual({
    cameraOpenAt: '2026-12-08T07:00:00.000Z',
    cameraCloseAt: '2026-12-08T15:00:00.000Z',
    uploadCloseAt: '2026-12-09T04:00:00.000Z',
    shotsPerDevice: 15,
    consentVersion: '2026-10-v1',
    now: '2026-12-08T10:00:00.000Z',
  });
  expect(JSON.stringify(s)).not.toContain('k'.repeat(24));
});
