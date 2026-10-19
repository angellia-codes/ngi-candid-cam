import { describe, expect, it } from 'vitest';
import { shouldWipe } from '@/lib/motion/channelSwitch';

describe('shouldWipe', () => {
  it('wipes between ordinary screens', () => {
    expect(shouldWipe('welcome', 'notice')).toBe(true);
    expect(shouldWipe('access', 'camera')).toBe(true);
    expect(shouldWipe('camera', 'roll')).toBe(true);
    expect(shouldWipe('roll', 'blocked')).toBe(true);
  });

  it('leaves the shooting loop and repeats alone', () => {
    expect(shouldWipe('camera', 'preview')).toBe(false);
    expect(shouldWipe('preview', 'camera')).toBe(false);
    expect(shouldWipe('roll', 'roll')).toBe(false);
  });
});
