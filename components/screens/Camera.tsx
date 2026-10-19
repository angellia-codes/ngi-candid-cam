'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Odometer } from '@/components/motion/Odometer';
import { PowerOn } from '@/components/motion/PowerOn';
import { ShutterBlades } from '@/components/motion/ShutterBlades';
import { captureFrame } from '@/lib/camera/capture';
import type { BlockReason } from '@/lib/camera/support';
import { useCamera } from '@/lib/camera/useCamera';
import { useNow } from '@/lib/client/useNow';
import { toKeyframes } from '@/lib/motion/flicker';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { entersLowFilm, shotTone } from '@/lib/motion/shotTone';
import { LOW_FILM_BLINK, LOW_FILM_BLINK_MS, MOMENTS } from '@/lib/motion/tokens';
import { formatStamp } from '@/lib/shared/time';

type Props = {
  active: boolean;
  shotsLeft: number;
  total: number;
  lastPhotoUrl: string | null;
  onCaptured: (photo: HTMLCanvasElement, capturedAt: Date) => void;
  onOpenRoll: () => void;
  onBlock: (reason: BlockReason) => void;
  onExit: () => void;
  /** Increments when a confirmed photo lands in the thumbnail (Task 20). */
  thumbBumpKey?: number;
};

const TIMERS = [0, 3, 10] as const;
type Timer = (typeof TIMERS)[number];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Bracket({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-8 border-paper ${className}`} />;
}

export function Camera({
  active,
  shotsLeft,
  total,
  lastPhotoUrl,
  onCaptured,
  onOpenRoll,
  onBlock,
  onExit,
  thumbBumpKey = 0,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const prevShotsLeft = useRef(shotsLeft);
  const capturingRef = useRef(false);
  const cam = useCamera(videoRef, active);
  const now = useNow(15_000);
  const [timer, setTimer] = useState<Timer>(0);
  const [count, setCount] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [whiteout, setWhiteout] = useState(false);
  const [shutterKey, setShutterKey] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cam.status === 'error' && cam.error) onBlock(cam.error);
  }, [cam.status, cam.error, onBlock]);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // Moment 9: the counter blinks twice when it first drops to 3 shots.
  useEffect(() => {
    const prev = prevShotsLeft.current;
    prevShotsLeft.current = shotsLeft;
    if (entersLowFilm(prev, shotsLeft) && !prefersReducedMotion()) {
      counterRef.current?.animate(toKeyframes(LOW_FILM_BLINK, LOW_FILM_BLINK_MS), { duration: LOW_FILM_BLINK_MS });
    }
  }, [shotsLeft]);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || cam.status !== 'live' || shotsLeft <= 0 || capturingRef.current) return;
    capturingRef.current = true;
    const lightFace = screenFlash && cam.facing === 'user';
    if (lightFace) {
      setWhiteout(true);
      await wait(180); // let the white screen light the face before the frame is taken
    }
    const capturedAt = new Date();
    const photo = captureFrame(video); // the photo is taken now; the blades play over it afterwards
    setWhiteout(false);
    if (!prefersReducedMotion()) {
      setShutterKey((k) => k + 1);
      await wait(MOMENTS.shutterBlades);
    }
    capturingRef.current = false;
    onCaptured(photo, capturedAt);
  }, [cam.status, cam.facing, screenFlash, shotsLeft, onCaptured]);

  const onShutter = () => {
    if (count !== null) return;
    if (timer === 0) return void shoot();
    let left: number = timer;
    setCount(left);
    countdownRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCount(null);
        void shoot();
      } else {
        setCount(left);
      }
    }, 1000);
  };

  const nextTimer = () => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length]!);
  const tone = shotTone(shotsLeft);
  const empty = tone === 'empty';
  const flashOn = cam.facing === 'user' ? screenFlash : cam.torchOn;
  const canFlash = cam.facing === 'user' || cam.torchAvailable;

  return (
    <main className="relative flex h-dvh flex-col bg-ink">
      <header className="flex items-center justify-between px-4 py-2 font-label">
        <button
          type="button"
          onClick={onExit}
          aria-label="Close camera"
          className="grid size-12 place-items-center rounded-full text-cream focus-visible:outline-2 focus-visible:outline-gold"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-display text-gold">NF&apos;26</span>
        <span
          ref={counterRef}
          aria-live="polite"
          className={`min-w-16 text-right text-lg tracking-wider ${tone === 'normal' ? 'text-paper' : 'text-pink'}`}
        >
          <Odometer value={shotsLeft} /> EXP
        </span>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="relative aspect-[3/4] h-full max-h-full max-w-full overflow-hidden rounded-2xl border-2 border-gold bg-body">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`size-full object-cover ${cam.facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <Bracket className="left-4 top-4 border-l-[3px] border-t-[3px]" />
          <Bracket className="right-4 top-4 border-r-[3px] border-t-[3px]" />
          <Bracket className="bottom-4 left-4 border-b-[3px] border-l-[3px]" />
          <Bracket className="bottom-4 right-4 border-b-[3px] border-r-[3px]" />
          <span className="absolute bottom-5 left-14 font-label text-green drop-shadow">{formatStamp(now)}</span>
          {cam.status === 'starting' && (
            <span className="absolute inset-0 grid place-items-center font-label text-cream/70">Opening camera…</span>
          )}
          {count !== null && (
            <span
              key={count}
              aria-live="assertive"
              className={`m-timer-digit absolute inset-0 grid place-items-center font-display text-[clamp(6rem,40vw,11rem)] leading-none drop-shadow-lg ${
                count === 1 ? 'text-gold' : 'text-paper'
              }`}
            >
              <span className={count === 1 ? 'm-timer-pulse' : ''}>{count}</span>
            </span>
          )}
          {empty && (
            <div className="m-fade absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/60 p-6 text-center">
              <span className="rounded-md border-[3px] border-pink bg-ink px-4 py-2 font-display text-3xl text-pink">FILM FULL</span>
              <p className="font-label text-lg text-paper">
                All {total} shots used. Open My Roll to save your photos.
              </p>
            </div>
          )}
          {shutterKey > 0 && <ShutterBlades key={shutterKey} />}
        </div>
      </div>

      <footer className="grid grid-cols-3 items-center gap-2 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={nextTimer}
            aria-label={`Self-timer: ${timer === 0 ? 'off' : `${timer} seconds`}`}
            className="min-h-12 min-w-12 rounded-full border border-cream/30 px-3 font-label text-cream"
          >
            {timer === 0 ? 'Timer off' : `${timer}s`}
          </button>
          {canFlash && (
            <button
              type="button"
              onClick={() => (cam.facing === 'user' ? setScreenFlash((v) => !v) : cam.setTorch(!cam.torchOn))}
              aria-pressed={flashOn}
              aria-label={cam.facing === 'user' ? 'Screen flash' : 'Torch'}
              className={`grid size-12 place-items-center rounded-full border ${flashOn ? 'border-gold text-gold' : 'border-cream/30 text-cream'}`}
            >
              <svg width="16" height="28" viewBox="0 0 16 28" aria-hidden="true">
                <path d="M3 1h8L6 12h7L4 27l3-12H1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onShutter}
            disabled={empty || cam.status !== 'live' || count !== null}
            aria-label="Take photo"
            className="size-20 rounded-full border-4 border-cream bg-gold shadow-[inset_0_0_0_4px_#0D0D0D] active:brightness-90 disabled:opacity-35"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {cam.hasMultiple && (
            <button
              type="button"
              onClick={cam.flip}
              aria-label={cam.facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
              className="grid size-12 place-items-center rounded-full border border-cream/30 text-cream"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" strokeLinecap="round" />
                <path d="M20 4v4h-4M4 20v-4h4" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <span key={thumbBumpKey} className={thumbBumpKey > 0 ? 'm-bump' : 'block'}>
            <button
              type="button"
              data-roll-thumb
              onClick={onOpenRoll}
              aria-label="Open My Roll"
              className="block size-12 overflow-hidden rounded-lg border border-cream/40 bg-body"
            >
              {lastPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lastPhotoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center font-label text-xs text-cream/60">ROLL</span>
              )}
            </button>
          </span>
        </div>
      </footer>

      {whiteout && <div aria-hidden="true" className="fixed inset-0 z-50 bg-white" />}
      {active && <PowerOn />}
    </main>
  );
}
