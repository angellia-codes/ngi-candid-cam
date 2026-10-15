import { describe, expect, it } from 'vitest';
import { isInAppBrowser, mapCameraError } from '@/lib/camera/support';

const err = (name: string) => Object.assign(new Error(name), { name });

describe('isInAppBrowser', () => {
  it('detects social app browsers', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit Instagram 310.0')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) [FBAN/EMA;FBAV/400.0]')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (Linux) musical_ly_2023 BytedanceWebview')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 Line/13.20.0')).toBe(true);
  });
  it('allows Safari and Chrome', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36')).toBe(false);
  });
});

describe('mapCameraError', () => {
  it('maps browser errors to screens', () => {
    expect(mapCameraError(err('NotAllowedError'))).toBe('denied');
    expect(mapCameraError(err('SecurityError'))).toBe('denied');
    expect(mapCameraError(err('NotReadableError'))).toBe('busy');
    expect(mapCameraError(err('AbortError'))).toBe('busy');
    expect(mapCameraError(err('OverconstrainedError'))).toBe('retry_relaxed');
    expect(mapCameraError(err('NotFoundError'))).toBe('no_camera');
    expect(mapCameraError('weird')).toBe('no_camera');
  });
});
