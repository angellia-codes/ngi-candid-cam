import { describe, expect, it } from 'vitest';
import { BRACKET, OUT, PHOTO, TEXT } from '@/lib/image/frameLayout';

const photoBottom = PHOTO.y + PHOTO.height;

describe('frame layout', () => {
  it('matches the 1320×1920 output with a 1200×1600 photo window', () => {
    expect(OUT).toEqual({ width: 1320, height: 1920 });
    expect(PHOTO.width / PHOTO.height).toBeCloseTo(3 / 4);
    expect(PHOTO.x * 2 + PHOTO.width).toBe(OUT.width);
  });

  it('keeps overlay text inside the photo and inside the brackets', () => {
    for (const y of [TEXT.nf26.y, TEXT.shot.y, TEXT.stamp.y, TEXT.hashtag.y]) {
      expect(y).toBeGreaterThan(PHOTO.y + BRACKET.inset);
      expect(y).toBeLessThan(photoBottom - BRACKET.inset + 1);
    }
    expect(TEXT.shot.rightX).toBeLessThan(PHOTO.x + PHOTO.width - BRACKET.inset);
  });

  it('places the band below the photo and inside the card', () => {
    for (const y of [TEXT.title.y, TEXT.year.y, TEXT.date.y]) {
      expect(y).toBeGreaterThan(photoBottom);
      expect(y).toBeLessThan(OUT.height);
    }
  });
});
