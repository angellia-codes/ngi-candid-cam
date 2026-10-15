import { describe, expect, it } from 'vitest';
import { inspectJpeg } from '@/lib/security/validateImage';
import { fakeJpeg } from '@/test/fixtures';

describe('inspectJpeg', () => {
  it('reads the size from the SOF marker', () => {
    expect(inspectJpeg(fakeJpeg(1320, 1920))).toEqual({ width: 1320, height: 1920 });
    expect(inspectJpeg(fakeJpeg(640, 480, 100))).toEqual({ width: 640, height: 480 });
  });

  it('rejects files that are not JPEG', () => {
    expect(inspectJpeg(new TextEncoder().encode('<svg></svg>'))).toBeNull();
    expect(inspectJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('rejects a JPEG with no frame header', () => {
    expect(inspectJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
  });
});
