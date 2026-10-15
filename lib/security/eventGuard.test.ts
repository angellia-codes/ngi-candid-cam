import { describe, expect, it } from 'vitest';
import { isValidEventKey, isWithinUploadWindow, safeEqual } from '@/lib/security/eventGuard';
import { testEnv } from '@/test/fixtures';

describe('event key', () => {
  it('accepts the exact key only', () => {
    expect(isValidEventKey('k'.repeat(24), 'k'.repeat(24))).toBe(true);
    expect(isValidEventKey('k'.repeat(23), 'k'.repeat(24))).toBe(false);
    expect(isValidEventKey(undefined, 'k'.repeat(24))).toBe(false);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});

describe('upload window', () => {
  const e = testEnv();
  it('is closed before the camera opens', () => {
    expect(isWithinUploadWindow(new Date('2026-12-08T06:59:59Z'), e)).toBe(false);
  });
  it('is open during the event and the morning after', () => {
    expect(isWithinUploadWindow(new Date('2026-12-08T07:00:00Z'), e)).toBe(true);
    expect(isWithinUploadWindow(new Date('2026-12-09T03:59:59Z'), e)).toBe(true);
  });
  it('is closed after 9 Dec 12:00 WITA', () => {
    expect(isWithinUploadWindow(new Date('2026-12-09T04:00:01Z'), e)).toBe(false);
  });
});
