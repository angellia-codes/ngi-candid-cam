'use client';

import { useEffect, useRef, useState } from 'react';
import { toKeyframes } from '@/lib/motion/flicker';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { MOMENTS, MOTION, POWER_ON, POWER_ON_LOGO } from '@/lib/motion/tokens';

const SESSION_KEY = 'nf26.poweredOn';

function alreadyPoweredOn(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markPoweredOn(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Private mode: power-on may show again next visit, which is harmless.
  }
}

/** LCD power-on (spec moment 1): once per browser session, 600 ms, a tap skips it. */
export function PowerOn() {
  // Camera only mounts after a tap, never during server rendering, so sessionStorage is safe here.
  const [show, setShow] = useState(() => !alreadyPoweredOn());
  const rootRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const animsRef = useRef<Animation[]>([]);

  useEffect(() => {
    if (!show) return;
    const root = rootRef.current;
    const scan = scanRef.current;
    const logo = logoRef.current;
    if (!root || !scan || !logo) return;
    markPoweredOn();

    const total = MOMENTS.powerOn;
    const anims: Animation[] = [];
    if (prefersReducedMotion()) {
      logo.style.opacity = '0';
      scan.style.opacity = '0';
      anims.push(root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MOTION.fast, fill: 'forwards' }));
    } else {
      const h = window.innerHeight;
      const scanEnd = POWER_ON.scanMs / total;
      anims.push(
        scan.animate(
          [
            { offset: 0, transform: 'translateY(0)', opacity: 1 },
            { offset: scanEnd, transform: `translateY(${h}px)`, opacity: 1 },
            { offset: scanEnd, transform: `translateY(${h}px)`, opacity: 0 },
            { offset: 1, transform: `translateY(${h}px)`, opacity: 0 },
          ],
          { duration: total, fill: 'forwards' },
        ),
        logo.animate(toKeyframes(POWER_ON_LOGO, total), { duration: total, fill: 'forwards' }),
        root.animate(
          [
            { offset: 0, opacity: 1 },
            { offset: POWER_ON.fadeStartMs / total, opacity: 1 },
            { offset: 1, opacity: 0 },
          ],
          { duration: total, fill: 'forwards' },
        ),
      );
    }
    animsRef.current = anims;
    const last = anims.at(-1)!;
    // A cancelled animation (unmount, React strict mode) rejects; that is not a finish.
    last.finished.then(() => setShow(false), () => undefined);
    return () => anims.forEach((a) => a.cancel());
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      onPointerDown={() => animsRef.current.forEach((a) => a.finish())}
      className="fixed inset-0 z-50 bg-[#050505]"
    >
      <div
        ref={logoRef}
        aria-hidden="true"
        style={{ opacity: 0, textShadow: '0 0 18px rgba(212,175,55,0.45)' }}
        className="absolute inset-0 grid place-items-center font-display text-6xl text-gold"
      >
        NF&apos;26
      </div>
      <p className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center font-label text-xs tracking-[0.3em] text-muted">
        TAP TO SKIP
      </p>
      <div
        ref={scanRef}
        aria-hidden="true"
        className="absolute inset-x-0 -top-[3px] h-[3px] bg-paper shadow-[0_0_16px_4px_rgba(245,240,230,0.55)]"
      />
    </div>
  );
}
