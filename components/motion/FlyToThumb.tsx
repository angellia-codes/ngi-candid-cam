'use client';

import { useEffect, useRef } from 'react';
import { flyTransform, type Box } from '@/lib/motion/flip';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { EASE, MOMENTS, MOTION } from '@/lib/motion/tokens';

/** Moment 7: the confirmed photo shrinks and flies into the My Roll thumbnail on the camera. */
export function FlyToThumb({ src, from, onDone }: { src: string; from: Box; onDone: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: Animation | null = null;
    let cancelled = false;

    void el
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const thumb = document.querySelector<HTMLElement>('[data-roll-thumb]')?.getBoundingClientRect();
        if (!thumb || thumb.width === 0 || prefersReducedMotion()) {
          anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MOTION.fast, fill: 'forwards' });
        } else {
          const { dx, dy, scale } = flyTransform(from, {
            left: thumb.left,
            top: thumb.top,
            width: thumb.width,
            height: thumb.height,
          });
          const end = `translate(${dx}px, ${dy}px) scale(${scale})`;
          anim = el.animate(
            [
              { offset: 0, transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { offset: 0.9, transform: end, opacity: 1 },
              { offset: 1, transform: end, opacity: 0 },
            ],
            { duration: MOMENTS.confirm, easing: EASE.snap, fill: 'forwards' },
          );
        }
        // A cancelled animation (unmount, React strict mode) rejects; only a real finish calls onDone.
        anim.finished.then(() => done.current(), () => undefined);
      });

    return () => {
      cancelled = true;
      anim?.cancel();
    };
  }, [from]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed z-50 rounded-lg shadow-2xl"
      style={{ left: from.left, top: from.top, width: from.width, height: from.height, transformOrigin: '0 0' }}
    />
  );
}
