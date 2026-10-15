'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { composeFrame } from '@/lib/image/compose';
import { canvasToBlob, encodeJpeg } from '@/lib/image/encode';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
import { formatFileName, formatShot, formatStamp } from '@/lib/shared/time';

type Props = {
  photo: HTMLCanvasElement;
  capturedAt: Date;
  shotNumber: number;
  total: number;
  onRetake: () => void;
  onConfirm: (input: { photoId: string; bytes: ArrayBuffer }) => Promise<void>;
};

export function Preview({ photo, capturedAt, shotNumber, total, onRetake, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoId = useMemo(() => crypto.randomUUID(), []);
  const [filterIndex, setFilterIndex] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState<null | 'confirm' | 'save'>(null);
  const [error, setError] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    void ensureFrameFonts().then(() => {
      if (cancelled || !canvasRef.current) return;
      composeFrame(canvasRef.current, {
        photo,
        filter: FILTERS[filterIndex]!,
        shotLabel: formatShot(shotNumber, total),
        stamp: formatStamp(capturedAt),
      });
      setRendering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [photo, filterIndex, shotNumber, total, capturedAt]);

  const encode = () => encodeJpeg(canvasToBlob(canvasRef.current!));

  const confirm = async () => {
    setBusy('confirm');
    setError(null);
    try {
      const blob = await encode();
      await onConfirm({ photoId, bytes: await blob.arrayBuffer() });
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

  const step = (delta: number) => setFilterIndex((i) => (i + delta + FILTERS.length) % FILTERS.length);

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
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Framed photo, ${FILTERS[filterIndex]!.label} look`}
          className={`h-full max-h-full w-auto max-w-full rounded-lg shadow-2xl transition-opacity ${rendering ? 'opacity-60' : ''}`}
        />
      </div>

      <div role="group" aria-label="Film look" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={i === filterIndex}
            onClick={() => setFilterIndex(i)}
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
      <button type="button" onClick={save} disabled={busy !== null || rendering} className="min-h-11 font-label text-gold underline underline-offset-4 disabled:opacity-40">
        {busy === 'save' ? 'Preparing…' : 'Save to phone'}
      </button>
    </main>
  );
}
