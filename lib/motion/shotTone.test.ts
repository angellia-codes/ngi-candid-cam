import { describe, expect, it } from 'vitest';
import { entersLowFilm, shotTone } from '@/lib/motion/shotTone';

describe('shotTone', () => {
  it('turns low at 3 shots and empty at 0', () => {
    expect([15, 4, 3, 1, 0, -1].map(shotTone)).toEqual(['normal', 'normal', 'low', 'low', 'empty', 'empty']);
  });

  it('blinks only when the counter first drops into low film', () => {
    expect(entersLowFilm(4, 3)).toBe(true);
    expect(entersLowFilm(3, 2)).toBe(false);
    expect(entersLowFilm(3, 3)).toBe(false);
    expect(entersLowFilm(2, 3)).toBe(false);
    expect(entersLowFilm(1, 0)).toBe(false);
  });
});
