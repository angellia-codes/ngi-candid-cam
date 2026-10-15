import { describe, expect, it } from 'vitest';
import { encodeJpeg } from '@/lib/image/encode';

const blobOf = (size: number) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });

describe('encodeJpeg', () => {
  it('keeps the first quality when the file is small enough', async () => {
    const asked: number[] = [];
    const out = await encodeJpeg(async (q) => (asked.push(q), blobOf(900_000)));
    expect(out.size).toBe(900_000);
    expect(asked).toEqual([0.82]);
  });

  it('steps quality down until under 1.5 MB', async () => {
    const sizes: Record<number, number> = { 0.82: 2_000_000, 0.76: 1_600_000, 0.7: 1_200_000 };
    const asked: number[] = [];
    const out = await encodeJpeg(async (q) => (asked.push(q), blobOf(sizes[q]!)));
    expect(asked).toEqual([0.82, 0.76, 0.7]);
    expect(out.size).toBe(1_200_000);
  });

  it('accepts the last step under the 3 MB hard limit', async () => {
    const out = await encodeJpeg(async () => blobOf(2_500_000));
    expect(out.size).toBe(2_500_000);
  });

  it('fails above the hard limit', async () => {
    await expect(encodeJpeg(async () => blobOf(3_100_000))).rejects.toThrow('Photo is too large to save. Please retake it.');
  });
});
