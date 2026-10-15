import { describe, expect, it } from 'vitest';
import { preflight } from '@/lib/app/preflight';

const open = Date.parse('2026-12-08T07:00:00Z');
const close = Date.parse('2026-12-08T15:00:00Z');
const base = {
  ua: 'Mozilla/5.0 (iPhone) Version/17.5 Mobile/15E148 Safari/604.1',
  hasMediaDevices: true,
  hasKey: true,
  now: Date.parse('2026-12-08T12:00:00Z'),
  cameraOpenAt: open,
  cameraCloseAt: close,
};

describe('preflight', () => {
  it('passes during the event in a normal browser', () => {
    expect(preflight(base)).toBeNull();
  });
  it('reports the first blocking problem in a fixed order', () => {
    expect(preflight({ ...base, ua: 'Instagram', hasKey: false })).toBe('in_app');
    expect(preflight({ ...base, hasKey: false })).toBe('no_key');
    expect(preflight({ ...base, hasMediaDevices: false })).toBe('no_camera');
    expect(preflight({ ...base, now: open - 1 })).toBe('not_open');
    expect(preflight({ ...base, now: close + 1 })).toBe('closed');
  });
});
