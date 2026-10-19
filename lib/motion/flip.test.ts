import { describe, expect, it } from 'vitest';
import { flyTransform } from '@/lib/motion/flip';

describe('flyTransform', () => {
  it('shrinks the card to fit the thumbnail and centres it there', () => {
    const t = flyTransform({ left: 30, top: 70, width: 330, height: 480 }, { left: 40, top: 644, width: 56, height: 56 });
    expect(t.scale).toBeCloseTo(56 / 480);
    expect(t.dx).toBeCloseTo(40 + (56 - 330 * (56 / 480)) / 2 - 30);
    expect(t.dy).toBeCloseTo(644 - 70);
  });

  it('does nothing when the boxes match', () => {
    const box = { left: 10, top: 20, width: 100, height: 150 };
    expect(flyTransform(box, box)).toEqual({ dx: 0, dy: 0, scale: 1 });
  });
});
