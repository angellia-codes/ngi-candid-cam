import { describe, expect, it } from 'vitest';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';

const fakeWindow = (reduce: boolean) => ({
  matchMedia: (q: string) => ({ matches: reduce && q === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
});

describe('prefersReducedMotion', () => {
  it('reads the media query', () => {
    expect(prefersReducedMotion(fakeWindow(true))).toBe(true);
    expect(prefersReducedMotion(fakeWindow(false))).toBe(false);
  });

  it('falls back to full motion when matchMedia is missing or throws', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    const broken = {
      matchMedia: () => {
        throw new Error('nope');
      },
    };
    expect(prefersReducedMotion(broken)).toBe(false);
  });
});
