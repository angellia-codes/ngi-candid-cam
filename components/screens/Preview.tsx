'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { composeFrame, drawLiveText } from '@/lib/image/compose';
import { canvasToBlob, encodeJpeg } from '@/lib/image/encode';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
import type { Box } from '@/lib/motion/flip';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { EASE, MOMENTS, MOTION, REVEAL } from '@/lib/motion/tokens';
import { typingSteps } from '@/lib/motion/typing';
import { formatFileName, formatShot, formatStamp } from '@/lib/shared/time';

type Props = {
  photo: HTMLCanvasElement;
  capturedAt: Date;
  shotNumber: number;
  total: number;
  onRetake: () => void;
  onConfirm: (input: { photoId: string; bytes: ArrayBuffer; box: Box }) => Promise<void>;
};

const SLIDE_PX = 48;

export function Preview({ photo, capturedAt, shotNumber, total, onRetake, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);
  const shownFilterRef = useRef(-1);
  const dirRef = useRef(1);
  const photoId = useMemo(() => crypto.randomUUID(), []);
  const [filterIndex, setFilterIndex] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState<null | 'confirm' | 'save'>(null);
  const [error, setError] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setRendering(true);

    void ensureFrameFonts().then(() => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (cancelled || !canvas || !wrap) return;
      const input = {
        photo,
        filter: FILTERS[filterIndex]!,
        shotLabel: formatShot(shotNumber, total),
        stamp: formatStamp(capturedAt),
      };
      const reduced = prefersReducedMotion();
      const filterChanged = shownFilterRef.current !== filterIndex;
      shownFilterRef.current = filterIndex;

      // Moment 5: first render drops the card in, then types the shot counter and time.
      if (!revealedRef.current) {
        revealedRef.current = true;
        wrap.animate(
          reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'scale(1.04)' },
                { opacity: 1, transform: 'scale(1)' },
              ],
          { duration: reduced ? MOTION.fast : REVEAL.dropMs, easing: EASE.snap, fill: 'forwards' },
        );
        if (reduced) {
          composeFrame(canvas, input);
          setRendering(false);
          return;
        }
        composeFrame(canvas, input, { liveText: false });
        const base = document.createElement('canvas');
        base.width = canvas.width;
        base.height = canvas.height;
        base.getContext('2d')!.drawImage(canvas, 0, 0);
        const ctx = canvas.getContext('2d')!;
        const shot = typingSteps(input.shotLabel.length, REVEAL.typingSteps);
        const stamp = typingSteps(input.stamp.length, REVEAL.typingSteps);
        shot.forEach((_, i) => {
          timers.push(
            setTimeout(() => {
              ctx.drawImage(base, 0, 0);
              drawLiveText(ctx, input, { shot: shot[i]!, stamp: stamp[i]! });
              if (i === shot.length - 1) setRendering(false);
            }, REVEAL.typingStartMs + i * REVEAL.typingStepMs),
          );
        });
        return;
      }

      // Moment 6: a new filter slides in from the swipe direction and snaps with a small overshoot.
      composeFrame(canvas, input);
      setRendering(false);
      if (!filterChanged) return;
      wrap.animate(
        reduced
          ? [{ opacity: 0.4 }, { opacity: 1 }]
          : [{ transform: `translateX(${dirRef.current * SLIDE_PX}px)` }, { transform: 'translateX(0)' }],
        { duration: reduced ? MOTION.fast : MOMENTS.filter, easing: reduced ? 'linear' : EASE.overshoot },
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [photo, filterIndex, shotNumber, total, capturedAt]);

  const encode = () => encodeJpeg(canvasToBlob(canvasRef.current!));

  const confirm = async () => {
    setBusy('confirm');
    setError(null);
    try {
      const blob = await encode();
      const r = canvasRef.current!.getBoundingClientRect();
      await onConfirm({
        photoId,
        bytes: await blob.arrayBuffer(),
        box: { left: r.left, top: r.top, width: r.width, height: r.height },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo. Try again.');
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      await savePhoto(await encode(), formatFileName(capturedAt, photoId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save to your phone.');
    } finally {
      setBusy(null);
    }
  };

  const select = (next: number) => {
    if (next === filterIndex) return;
    dirRef.current = next > filterIndex ? 1 : -1;
    setFilterIndex(next);
  };

  const step = (delta: 1 | -1) => {
    dirRef.current = delta;
    setFilterIndex((i) => (i + delta + FILTERS.length) % FILTERS.length);
  };

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
      >
        <div ref={wrapRef} style={{ opacity: 0 }} className="flex h-full max-h-full items-center justify-center">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Framed photo, ${FILTERS[filterIndex]!.label} look`}
            className="h-full max-h-full w-auto max-w-full rounded-lg shadow-2xl"
          />
        </div>
      </div>

      <p aria-hidden="true" className="h-5 overflow-hidden text-center font-label text-sm leading-5 tracking-[0.3em] text-paper">
        <span key={filterIndex} className="m-lcd-swap block">
          {FILTERS[filterIndex]!.label.toUpperCase()}
        </span>
      </p>

      <div role="group" aria-label="Film look" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={i === filterIndex}
            onClick={() => select(i)}
            className={`min-h-11 shrink-0 rounded-full border px-4 font-label text-sm uppercase tracking-wide ${
              i === filterIndex ? 'border-gold bg-gold text-ink' : 'border-cream/30 text-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-pink">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onRetake} disabled={busy !== null}>
          Retake
        </Button>
        <Button onClick={confirm} disabled={busy !== null || rendering}>
          {busy === 'confirm' ? 'Saving…' : 'Confirm'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted">Confirm uses 1 of your {total} shots. Retakes are free.</p>
      <button
        type="button"
        onClick={save}
        disabled={busy !== null || rendering}
        className="min-h-11 font-label text-gold underline underline-offset-4 disabled:opacity-40"
      >
        {busy === 'save' ? 'Preparing…' : 'Save to phone'}
      </button>

      {/* Moment 2, second half: the shutter flash plays as Preview opens. */}
      <div aria-hidden="true" className="m-flash pointer-events-none fixed inset-0 z-40 bg-white" />
    </main>
  );
}
