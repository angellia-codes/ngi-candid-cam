import { describe, expect, it } from 'vitest';
import { formatFileName, formatShot, formatStamp, formatWitaShort } from '@/lib/shared/time';

// 11:34:12 UTC is 19:34:12 WITA
const d = new Date('2026-12-08T11:34:12Z');

describe('WITA formatting', () => {
  it('formats the film date stamp', () => {
    expect(formatStamp(d)).toBe("'26 12 08 19:34");
  });

  it('rolls over midnight in WITA', () => {
    expect(formatStamp(new Date('2026-12-08T16:05:00Z'))).toBe("'26 12 09 00:05");
  });

  it('builds the Drive and download file name', () => {
    expect(formatFileName(d, '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')).toBe('NF26_20261208-193412_1b9d6bcd.jpg');
  });

  it('pads the shot counter', () => {
    expect(formatShot(7, 15)).toBe('07/15');
    expect(formatShot(15, 15)).toBe('15/15');
  });

  it('formats a short day and time', () => {
    expect(formatWitaShort(new Date('2026-12-08T07:00:00Z'))).toBe('8 Dec, 15:00');
  });
});
