import { describe, expect, it } from 'vitest';
import { typingSteps } from '@/lib/motion/typing';

describe('typingSteps', () => {
  it('spreads the characters over the steps and ends on the full text', () => {
    expect(typingSteps(5, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(typingSteps(15, 5)).toEqual([3, 6, 9, 12, 15]);
    expect(typingSteps(7, 5)).toEqual([2, 3, 5, 6, 7]);
  });

  it('handles empty text', () => {
    expect(typingSteps(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });
});
