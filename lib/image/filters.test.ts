import { describe, expect, it } from 'vitest';
import { FILTERS, applyColorMatrix } from '@/lib/image/filters';

const byId = (id: string) => FILTERS.find((f) => f.id === id)!;

describe('filters', () => {
  it('lists Original first and five filters in total', () => {
    expect(FILTERS.map((f) => f.id)).toEqual(['original', 'nf-film', 'flash-mono', 'gold-hour', 'neon-night']);
    for (const f of FILTERS) expect(f.matrix).toHaveLength(20);
  });

  it('leaves pixels unchanged for Original', () => {
    const px = new Uint8ClampedArray([10, 120, 250, 255]);
    applyColorMatrix(px, byId('original').matrix);
    expect([...px]).toEqual([10, 120, 250, 255]);
  });

  it('makes Flash Mono grey', () => {
    const px = new Uint8ClampedArray([200, 80, 30, 255, 20, 40, 60, 255]);
    applyColorMatrix(px, byId('flash-mono').matrix);
    expect(px[0]).toBe(px[1]);
    expect(px[1]).toBe(px[2]);
    expect(px[4]).toBe(px[6]);
    expect(px[3]).toBe(255);
  });

  it('clamps to the 0–255 range', () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    applyColorMatrix(px, byId('gold-hour').matrix);
    expect(Math.max(...px)).toBeLessThanOrEqual(255);
    expect(Math.min(...px)).toBeGreaterThanOrEqual(0);
  });
});
