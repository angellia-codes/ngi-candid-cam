'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Screen } from '@/lib/app/machine';
import { shouldWipe } from '@/lib/motion/channelSwitch';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { MOMENTS } from '@/lib/motion/tokens';

/** Moment 10: a black panel covers the new screen before paint, then slides off to the left. */
export function useChannelSwitch(panel: RefObject<HTMLElement | null>, screen: Screen): void {
  const prev = useRef(screen);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = screen;
    const el = panel.current;
    if (!el || !shouldWipe(from, screen)) return;
    el.animate(
      prefersReducedMotion()
        ? [
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(0)', opacity: 0 },
          ]
        : [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
      { duration: MOMENTS.screenChange, easing: 'linear' },
    );
  }, [screen, panel]);
}
