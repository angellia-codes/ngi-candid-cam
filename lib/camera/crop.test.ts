import { describe, expect, it } from 'vitest';
import { coverCrop } from '@/lib/camera/crop';

describe('coverCrop to 3:4', () => {
  it('trims the sides of a landscape 4:3 frame', () => {
    expect(coverCrop(1920, 1440)).toEqual({ sx: 420, sy: 0, sw: 1080, sh: 1440 });
  });
  it('keeps a portrait 3:4 frame whole', () => {
    expect(coverCrop(1440, 1920)).toEqual({ sx: 0, sy: 0, sw: 1440, sh: 1920 });
  });
  it('trims top and bottom of a tall 9:16 frame', () => {
    expect(coverCrop(1080, 1920)).toEqual({ sx: 0, sy: 240, sw: 1080, sh: 1440 });
  });
});
