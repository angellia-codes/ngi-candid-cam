import { describe, expect, it } from 'vitest';
import { flashesPerSecond, toKeyframes } from '@/lib/motion/flicker';
import { LOW_FILM_BLINK, POWER_ON_LOGO } from '@/lib/motion/tokens';

describe('flashesPerSecond', () => {
  it('counts the worst one-second window', () => {
    const fast = [0, 100, 200, 300, 400, 500, 600, 700].map((at, i) => ({ at, visible: i % 2 === 1 }));
    expect(flashesPerSecond(fast)).toBe(4);
    expect(flashesPerSecond([{ at: 0, visible: false }, { at: 1500, visible: true }])).toBe(1);
  });

  it('keeps every blink schedule at 2 flashes per second or fewer', () => {
    expect(flashesPerSecond(POWER_ON_LOGO)).toBeLessThanOrEqual(2);
    expect(flashesPerSecond(LOW_FILM_BLINK)).toBeLessThanOrEqual(2);
  });
});

describe('toKeyframes', () => {
  it('turns a blink schedule into stepped opacity keyframes', () => {
    expect(toKeyframes(POWER_ON_LOGO, 600)).toEqual([
      { offset: 0, opacity: 0 },
      { offset: 0.35, opacity: 0 },
      { offset: 0.35, opacity: 1 },
      { offset: 0.45, opacity: 1 },
      { offset: 0.45, opacity: 0 },
      { offset: 0.525, opacity: 0 },
      { offset: 0.525, opacity: 1 },
      { offset: 1, opacity: 1 },
    ]);
  });

  it('starts visible when the first toggle hides the element', () => {
    const frames = toKeyframes(LOW_FILM_BLINK, 960);
    expect(frames[0]).toEqual({ offset: 0, opacity: 1 });
    expect(frames[2]).toEqual({ offset: 0, opacity: 0 });
    expect(frames.at(-1)).toEqual({ offset: 1, opacity: 1 });
  });
});
