# NourishFest 2026 Candid Cam — Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 10 in-app motion moments from the spec's Motion section to the Candid Cam, so the app moves like an early-2000s digicam without ever slowing the next shot.

**Architecture:** One token file (`lib/motion/tokens.ts`) holds every duration, easing and blink schedule. Looping and replayable moments are CSS keyframe classes in `app/globals.css`, replayed by changing a React `key`. One-shot sequences that need measured positions or tested blink schedules (power-on, low film, filter advance, confirm flight, screen change) use the Web Animations API (`element.animate`). Every moment has a reduced-motion version, chosen at run time by `prefersReducedMotion()` or by CSS media query.

**Tech Stack:** Same as the main plan (Next.js 15, React 19, TypeScript, Tailwind CSS v4, Vitest). No new dependencies.

**Builds on:** `docs/superpowers/plans/2026-10-15-nourishfest-candid-cam.md`, Tasks 1–14. Run Tasks 17–23 after Task 14 and before Task 15. They belong to milestone M5 and must be done before the 24 Nov code freeze.

**Spec:** "NourishFest 2026 Digital Candid Cam — Design Spec" (Claude Docs), sections **Motion** and **Teaser**. Visual reference: the "NF'26 Motion" design canvas (one looping board per moment, plus slow-mo and reduced-motion tweaks) and the rendered clips `NF26-In-App-Motion-Reel.mp4`, `01-Main.mp4` … `10-ScreenChange.mp4`.

## Global Constraints

- Every moment except power-on finishes in 400 ms or less. Power-on is 600 ms, once per browser session, and a tap skips it.
- Durations (ms): power-on 600 · shutter 200 (blades 120, flash 80) · counter 250 · preview reveal 400 · filter swipe 250 · confirm 350 · saved stamp 200 · screen change 150.
- Shared tokens: `--motion-fast` 150 ms, `--motion-base` 250 ms, `--motion-slow` 400 ms, `--ease-snap` `cubic-bezier(0.2, 0, 0, 1)`, `--ease-overshoot` `cubic-bezier(0.3, 1.4, 0.5, 1)`, `--ease-mech` `steps(4)`.
- Flicker: at most 2 flashes in any one second (WCAG 2.3.1 allows 3). Applies to power-on, self-timer, low film and badges.
- Reduced motion: when the phone's reduced-motion setting is on, every moment uses its fallback from the spec's Motion table (crossfades, instant swaps, no flicker, no blades).
- Animate `transform` and `opacity` only, never layout. The camera stream runs underneath, and cheap Android phones stutter otherwise.
- Never block input. Overlays use `pointer-events: none`, except power-on, where a tap skips it.
- No sound. The shutter stays silent.
- Do not combine Tailwind `translate-*`, `scale-*` or `rotate-*` utilities with an element this plan animates. Tailwind v4 writes those to the separate `translate`, `scale` and `rotate` CSS properties, which stack with an animated `transform` and double the movement. Use inline `style={{ transform: … }}` instead.
- Palette (from the main plan's theme): ink #0D0D0D, body #17130F, cream #EDE6D6, paper #F5F0E6, gold #D4AF37, pink #FF1B6B, green #39FF14. This plan adds amber #FFB020 and alert #FF6B5E for upload badges.

## Decisions this plan adds to the spec

| Decision | Why |
| --- | --- |
| The shutter's white flash plays on the Preview screen's first frame, not on the camera | The camera is hidden the moment Preview opens (Task 14's wiring), so a flash drawn on the camera would never be seen. The blades play on the camera, then Preview opens behind the flash. |
| `onCaptured` fires 120 ms after the frame is grabbed | The photo is taken at the press, then the blades close and reopen over it. With reduced motion there is no delay. |
| Shot counter and timestamp "type in" by redrawing the canvas 5 times | They are drawn into the photo itself, so CSS cannot animate them. The base frame is drawn once and copied, so each step is a cheap copy plus two short strings. |
| The counter shows two digits ("09 EXP") | Matches the canvas mockups and keeps the odometer a fixed width. |
| The "Not sent" badge reads "Not sent · shot refunded", not "Tap to retry" as drawn on the canvas | The queue marks a photo Not sent only for rejections a retry cannot fix (device cap, window closed). Retryable failures show "Retrying", and My Roll has "Try sending now". |
| No screen-change wipe between Camera and Preview | Those moves have their own moments (shutter, reveal, confirm). |
| The screen-change wipe is a black panel sliding away with a scanline on its edge | It gives the same look as a clip-path wipe while animating only `transform`. |
| Reduced motion replaces Task 1's blanket `animation: none !important` rule | The spec gives each moment a gentler fallback, such as a crossfade. The blanket rule would remove those too. |

## Milestones → tasks

| Moment (spec #) | Task |
| --- | --- |
| Foundation: tokens, reduced motion, keyframes | 17 |
| 1 LCD power-on · 2 Shutter · 3 EXP counter · 4 Self-timer · 9 Low film | 18 |
| 5 Preview reveal · 6 Filter swipe | 19 |
| 7 Confirm | 20 |
| 8 Upload badges | 21 |
| 10 Screen change | 22 |
| Device and reduced-motion QA, release checklist | 23 |

## File structure

```text
app/globals.css                    MODIFY  motion classes, keyframes, reduced-motion fallbacks
lib/motion/
├─ tokens.ts                       durations, easings, blink schedules
├─ flicker.ts                      blink schedule → keyframes; flash-rate check
├─ reducedMotion.ts                prefersReducedMotion()
├─ shotTone.ts                     normal / low / empty counter state
├─ typing.ts                       typing steps for the reveal
├─ flip.ts                         preview → thumbnail flight transform
├─ badge.ts                        upload status → badge
└─ channelSwitch.ts                which screen moves get a wipe
lib/app/useChannelSwitch.ts        screen-change wipe hook
components/motion/
├─ PowerOn.tsx                     LCD power-on overlay
├─ ShutterBlades.tsx               two black blades
├─ Odometer.tsx                    rolling shot counter
├─ FlyToThumb.tsx                  confirm flight
└─ StatusBadge.tsx                 upload badge
components/screens/Camera.tsx      REPLACE (Task 18)
components/screens/Preview.tsx     REPLACE (Task 19), MODIFY (Task 20)
components/screens/Roll.tsx        MODIFY (Task 21)
components/CandidCamApp.tsx        MODIFY (Tasks 20, 22)
lib/image/compose.ts               MODIFY (Task 19)
docs/DEPLOY.md                     MODIFY (Task 23)
```

Tests sit next to the code (`lib/motion/*.test.ts`).

---

### Task 17: Motion tokens, reduced-motion switch and keyframes

**Files:**
- Create: `lib/motion/tokens.ts`, `lib/motion/tokens.test.ts`, `lib/motion/flicker.ts`, `lib/motion/flicker.test.ts`, `lib/motion/reducedMotion.ts`, `lib/motion/reducedMotion.test.ts`
- Modify: `app/globals.css` (full replacement)

**Interfaces:**
- Produces (`@/lib/motion/tokens`): `MOTION = { fast: 150, base: 250, slow: 400 }`; `EASE = { snap, overshoot, mech }` (CSS easing strings); `MOMENTS = { powerOn: 600, shutter: 200, shutterBlades: 120, shutterFlash: 80, counter: 250, reveal: 400, filter: 250, confirm: 350, stamp: 200, screenChange: 150 }`; `REVEAL = { dropMs: 300, typingStartMs: 210, typingSteps: 5, typingStepMs: 38 }`; `POWER_ON = { scanMs: 200, fadeStartMs: 450 }`; `type Toggle = { at: number; visible: boolean }`; `POWER_ON_LOGO: readonly Toggle[]`; `LOW_FILM_BLINK: readonly Toggle[]`; `LOW_FILM_BLINK_MS = 960`
- Produces (`@/lib/motion/flicker`): `toKeyframes(toggles: readonly Toggle[], totalMs: number): Keyframe[]`; `flashesPerSecond(toggles: readonly Toggle[]): number`
- Produces (`@/lib/motion/reducedMotion`): `prefersReducedMotion(win?: Pick<Window, 'matchMedia'>): boolean`
- Produces (CSS classes in `app/globals.css`): `m-flash`, `m-blade-top`, `m-blade-bottom`, `m-odo`, `m-timer-digit`, `m-timer-pulse`, `m-fade`, `m-lcd-swap`, `m-bump`, `m-badge-pulse`, `m-badge-march`, `m-badge-blink`, `m-badge-stamp`; theme colours `amber`, `alert`

- [ ] **Step 1: Write the failing tests**

`lib/motion/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LOW_FILM_BLINK, LOW_FILM_BLINK_MS, MOMENTS, POWER_ON, POWER_ON_LOGO, REVEAL } from '@/lib/motion/tokens';

describe('motion tokens', () => {
  it('keeps every moment except power-on within 400 ms', () => {
    const { powerOn, ...rest } = MOMENTS;
    expect(powerOn).toBe(600);
    for (const ms of Object.values(rest)) expect(ms).toBeLessThanOrEqual(400);
  });

  it('splits the shutter into blades then flash', () => {
    expect(MOMENTS.shutterBlades + MOMENTS.shutterFlash).toBe(MOMENTS.shutter);
  });

  it('finishes typing inside the reveal', () => {
    expect(REVEAL.typingStartMs + (REVEAL.typingSteps - 1) * REVEAL.typingStepMs).toBeLessThanOrEqual(MOMENTS.reveal);
    expect(REVEAL.dropMs).toBeLessThanOrEqual(MOMENTS.reveal);
  });

  it('finishes the logo blinks before the power-on overlay fades', () => {
    expect(Math.max(...POWER_ON_LOGO.map((t) => t.at))).toBeLessThan(POWER_ON.fadeStartMs);
    expect(Math.max(...LOW_FILM_BLINK.map((t) => t.at))).toBeLessThan(LOW_FILM_BLINK_MS);
  });
});
```

`lib/motion/flicker.test.ts`:

```ts
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
```

`lib/motion/reducedMotion.test.ts`:

```ts
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/motion`
Expected: FAIL, cannot resolve `@/lib/motion/tokens`, `@/lib/motion/flicker` and `@/lib/motion/reducedMotion`.

- [ ] **Step 3: Implement `lib/motion/tokens.ts`**

```ts
/** Single source for every motion duration, easing and blink schedule (spec: Motion section). */

export const MOTION = { fast: 150, base: 250, slow: 400 } as const;

export const EASE = {
  snap: 'cubic-bezier(0.2, 0, 0, 1)',
  overshoot: 'cubic-bezier(0.3, 1.4, 0.5, 1)',
  mech: 'steps(4, end)',
} as const;

/** Duration of each moment, ms. */
export const MOMENTS = {
  powerOn: 600,
  shutter: 200,
  shutterBlades: 120,
  shutterFlash: 80,
  counter: 250,
  reveal: 400,
  filter: 250,
  confirm: 350,
  stamp: 200,
  screenChange: 150,
} as const;

/** Preview reveal: the card drops in, then shot counter and timestamp type in. */
export const REVEAL = { dropMs: 300, typingStartMs: 210, typingSteps: 5, typingStepMs: 38 } as const;

/** Power-on: scanline sweep, then the overlay fades from fadeStartMs to MOMENTS.powerOn. */
export const POWER_ON = { scanMs: 200, fadeStartMs: 450 } as const;

/** A blink schedule entry: at `at` ms the element becomes visible or hidden. */
export type Toggle = { at: number; visible: boolean };

/** "NF'26" flickers on twice during power-on. */
export const POWER_ON_LOGO: readonly Toggle[] = [
  { at: 210, visible: true },
  { at: 270, visible: false },
  { at: 315, visible: true },
];

/** Counter blinks twice when 3 shots are left. */
export const LOW_FILM_BLINK_MS = 960;
export const LOW_FILM_BLINK: readonly Toggle[] = [
  { at: 0, visible: false },
  { at: 240, visible: true },
  { at: 480, visible: false },
  { at: 720, visible: true },
];
```

- [ ] **Step 4: Implement `lib/motion/flicker.ts`**

```ts
import type { Toggle } from '@/lib/motion/tokens';

/**
 * Stepped opacity keyframes for element.animate(). Two keyframes share each toggle's offset,
 * so the value jumps instead of fading. The element starts in the opposite state of the first toggle.
 */
export function toKeyframes(toggles: readonly Toggle[], totalMs: number): Keyframe[] {
  let current = toggles[0]?.visible ? 0 : 1;
  const frames: Keyframe[] = [{ offset: 0, opacity: current }];
  for (const t of toggles) {
    const offset = Math.min(1, t.at / totalMs);
    const next = t.visible ? 1 : 0;
    frames.push({ offset, opacity: current }, { offset, opacity: next });
    current = next;
  }
  frames.push({ offset: 1, opacity: current });
  return frames;
}

/** Highest number of flashes (a pair of opposite changes) in any one-second window. */
export function flashesPerSecond(toggles: readonly Toggle[]): number {
  let max = 0;
  for (const start of toggles) {
    const changes = toggles.filter((t) => t.at >= start.at && t.at < start.at + 1000).length;
    max = Math.max(max, Math.ceil(changes / 2));
  }
  return max;
}
```

- [ ] **Step 5: Implement `lib/motion/reducedMotion.ts`**

```ts
type MatchMediaHost = Pick<Window, 'matchMedia'>;

/** True when the phone asks for reduced motion. Read at animation time, so a settings change applies at once. */
export function prefersReducedMotion(
  win: MatchMediaHost | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  try {
    return Boolean(win?.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run lib/motion`
Expected: 10 passed.

- [ ] **Step 7: Replace `app/globals.css`**

This keeps Task 1's theme and base styles, adds the two badge colours, and replaces the blanket reduced-motion rule with per-moment fallbacks.

```css
@import "tailwindcss";

@theme {
  --color-ink: #0D0D0D;
  --color-body: #17130F;
  --color-cream: #EDE6D6;
  --color-paper: #F5F0E6;
  --color-gold: #D4AF37;
  --color-pink: #FF1B6B;
  --color-green: #39FF14;
  --color-muted: #A39A8B;
  --color-amber: #FFB020;
  --color-alert: #FF6B5E;
  --font-display: "Bungee", system-ui, sans-serif;
  --font-label: "Oswald", "Arial Narrow", sans-serif;
}

html,
body {
  min-height: 100%;
  background: var(--color-ink);
  color: var(--color-cream);
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/*
 * Motion. Durations and easings mirror lib/motion/tokens.ts.
 * One-shot classes replay when their element gets a new React key.
 */
.m-flash { opacity: 0; animation: m-flash 80ms linear forwards; }
.m-blade-top { transform: translateY(-101%); animation: m-blade-top 120ms linear forwards; }
.m-blade-bottom { transform: translateY(101%); animation: m-blade-bottom 120ms linear forwards; }
.m-odo { animation: m-roll 250ms cubic-bezier(0.2, 0, 0, 1) forwards; }
.m-timer-digit { animation: m-segment 1000ms linear; }
.m-timer-pulse { display: inline-block; animation: m-pulse 1000ms cubic-bezier(0.2, 0, 0, 1); }
.m-fade { animation: m-fade 150ms linear; }
.m-lcd-swap { animation: m-lcd 150ms steps(4, end); }
.m-bump { display: block; animation: m-bump 200ms cubic-bezier(0.3, 1.4, 0.5, 1); }
.m-badge-pulse { animation: m-badge-pulse 1.2s ease-in-out infinite alternate; }
.m-badge-march { animation: m-badge-march 600ms linear infinite; }
.m-badge-blink { animation: m-badge-blink 1s steps(1, end) infinite; }
.m-badge-stamp { animation: m-badge-stamp 200ms cubic-bezier(0.2, 0, 0, 1); }

@keyframes m-flash { from { opacity: 0.92; } to { opacity: 0; } }
@keyframes m-flash-soft { from { opacity: 0.5; } to { opacity: 0; } }
@keyframes m-blade-top {
  0% { transform: translateY(-101%); }
  50% { transform: translateY(0); }
  100% { transform: translateY(-101%); }
}
@keyframes m-blade-bottom {
  0% { transform: translateY(101%); }
  50% { transform: translateY(0); }
  100% { transform: translateY(101%); }
}
@keyframes m-roll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes m-segment {
  0% { opacity: 0; }
  4% { opacity: 1; }
  6% { opacity: 0.25; }
  8%, 100% { opacity: 1; }
}
@keyframes m-pulse {
  0% { transform: scale(1); }
  48% { transform: scale(1.12); }
  96%, 100% { transform: scale(1); }
}
@keyframes m-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes m-lcd { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes m-bump {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes m-badge-pulse { from { opacity: 0.3; } to { opacity: 1; } }
@keyframes m-badge-march { from { transform: translateX(-20px); } to { transform: translateX(0); } }
@keyframes m-badge-blink { 0% { opacity: 1; } 50% { opacity: 0.15; } }
@keyframes m-badge-stamp {
  from { opacity: 0; transform: scale(1.4); }
  to { opacity: 1; transform: scale(1); }
}

/* Reduced motion: the spec's fallback for each moment. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
  }
  .m-flash { animation-name: m-flash-soft; }
  .m-blade-top,
  .m-blade-bottom { animation: none; visibility: hidden; }
  .m-odo { animation-timing-function: steps(1, start); }
  .m-timer-digit,
  .m-timer-pulse,
  .m-lcd-swap,
  .m-bump,
  .m-badge-pulse,
  .m-badge-march,
  .m-badge-blink,
  .m-badge-stamp { animation: none; }
}
```

- [ ] **Step 8: Verify and commit**

Run: `npm run typecheck && npm test && npm run build`
Expected: no type errors; all tests pass (the main plan's tests plus 10 new); build succeeds. The app looks the same as before, because nothing uses the classes yet.

```bash
git add lib/motion app/globals.css
git commit -m "feat: motion tokens, blink schedules and reduced-motion fallbacks"
```

---

### Task 18: Camera screen motion — power-on, shutter, counter, self-timer, low film (moments 1, 2, 3, 4, 9)

**Files:**
- Create: `lib/motion/shotTone.ts`, `lib/motion/shotTone.test.ts`, `components/motion/PowerOn.tsx`, `components/motion/ShutterBlades.tsx`, `components/motion/Odometer.tsx`
- Modify: `components/screens/Camera.tsx` (full replacement)

**Interfaces:**
- Consumes: `MOMENTS`, `POWER_ON`, `POWER_ON_LOGO`, `LOW_FILM_BLINK`, `LOW_FILM_BLINK_MS` (17); `toKeyframes` (17); `prefersReducedMotion` (17); `captureFrame`, `useCamera`, `useNow`, `BlockReason`, `formatStamp` (main plan).
- Produces:
  - `type ShotTone = 'normal' | 'low' | 'empty'`; `LOW_FILM_AT = 3`; `shotTone(left: number): ShotTone`; `entersLowFilm(prev: number, next: number): boolean`
  - `PowerOn()`: self-contained overlay, shown once per browser session (sessionStorage key `nf26.poweredOn`)
  - `ShutterBlades()`: replays on every mount; the parent passes a new `key` per shot
  - `Odometer({ value }: { value: number })`
  - `Camera` keeps all its main-plan props and adds `thumbBumpKey?: number` (default 0). The roll thumbnail button gets the attribute `data-roll-thumb`. Task 20 drives both.

- [ ] **Step 1: Write the failing test**

`lib/motion/shotTone.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { entersLowFilm, shotTone } from '@/lib/motion/shotTone';

describe('shotTone', () => {
  it('turns low at 3 shots and empty at 0', () => {
    expect([15, 4, 3, 1, 0, -1].map(shotTone)).toEqual(['normal', 'normal', 'low', 'low', 'empty', 'empty']);
  });

  it('blinks only when the counter first drops into low film', () => {
    expect(entersLowFilm(4, 3)).toBe(true);
    expect(entersLowFilm(3, 2)).toBe(false);
    expect(entersLowFilm(3, 3)).toBe(false);
    expect(entersLowFilm(2, 3)).toBe(false);
    expect(entersLowFilm(1, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/motion/shotTone.test.ts`
Expected: FAIL, cannot resolve `@/lib/motion/shotTone`.

- [ ] **Step 3: Implement `lib/motion/shotTone.ts`**

```ts
export type ShotTone = 'normal' | 'low' | 'empty';

export const LOW_FILM_AT = 3;

export function shotTone(left: number): ShotTone {
  if (left <= 0) return 'empty';
  if (left <= LOW_FILM_AT) return 'low';
  return 'normal';
}

/** The low-film blink plays once, when the counter goes from normal to low. */
export function entersLowFilm(prev: number, next: number): boolean {
  return shotTone(prev) === 'normal' && shotTone(next) === 'low';
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/motion/shotTone.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Create `components/motion/Odometer.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

/** Two-digit counter that rolls up to its new value (spec moment 3). */
export function Odometer({ value }: { value: number }) {
  const prev = useRef(value);
  const [roll, setRoll] = useState<{ from: number; to: number; key: number } | null>(null);

  useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current;
    prev.current = value;
    setRoll((r) => ({ from, to: value, key: (r?.key ?? 0) + 1 }));
  }, [value]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-block h-[1.2em] overflow-hidden align-bottom leading-[1.2em] tabular-nums">
        {roll ? (
          <span key={roll.key} className="m-odo flex flex-col">
            <span>{pad(roll.from)}</span>
            <span>{pad(roll.to)}</span>
          </span>
        ) : (
          <span className="block">{pad(value)}</span>
        )}
      </span>
    </>
  );
}
```

- [ ] **Step 6: Create `components/motion/ShutterBlades.tsx`**

```tsx
/** Two black blades close over the viewfinder and reopen (spec moment 2). Mount with a new key per shot. */
export function ShutterBlades() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="m-blade-top absolute inset-x-0 top-0 h-1/2 border-b border-[#2A2420] bg-black" />
      <span className="m-blade-bottom absolute inset-x-0 bottom-0 h-1/2 border-t border-[#2A2420] bg-black" />
    </span>
  );
}
```

- [ ] **Step 7: Create `components/motion/PowerOn.tsx`**

```tsx
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
```

- [ ] **Step 8: Replace `components/screens/Camera.tsx`**

Changes from the main plan's Task 13 version: power-on overlay; blades replace the white `shutterFlash` (the flash moves to Preview in Task 19); `onCaptured` waits 120 ms for the blades; Odometer counter in cream that turns pink and blinks at 3 left; LCD self-timer digits; "FILM FULL" replaces "Roll finished"; `data-roll-thumb` and `thumbBumpKey` on the roll thumbnail.

```tsx
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
```

The shutter button drops Task 13's `transition active:scale-95`, so the blades are the only shutter motion; `active:brightness-90` still gives instant press feedback. It dims to 35% when the film is full, as the spec asks.

- [ ] **Step 9: Check in the browser**

Set `CAMERA_OPEN_AT` in `.env.local` to an hour ago. Run `npm run dev:https` and open `https://localhost:3000/?k=<EVENT_KEY>` in a new private window. Compare each moment with its board on the "NF'26 Motion" canvas (Tweaks › slow-mo helps) or with `01-Main.mp4` to `04-Timer.mp4` and `09-LowFilm.mp4`.

| Check | Expected |
| --- | --- |
| Open the camera for the first time in this window | Black screen, a scanline sweeps down, "NF'26" flickers on twice, the viewfinder fades up within 0.6 s |
| Reload, open the camera again | No power-on (once per session) |
| New private window, tap during power-on | Viewfinder appears at once |
| Shutter | Black blades close and reopen over the viewfinder, then Preview opens. No white flash yet (Task 19 adds it on Preview) |
| Retake, then Confirm in Preview | Counter rolls from 15 to 14 |
| Timer 3 s | Large 3, 2, 1 digits, each flickers once on change; 1 is gold and pulses |
| Confirm until 3 shots are left | Counter turns pink and blinks twice, once |
| Confirm until 0 shots are left | "FILM FULL" fades in; shutter dims and does not respond; My Roll still opens |
| DevTools › Rendering › Emulate `prefers-reduced-motion: reduce`, new private window | Power-on is a 150 ms fade; no blades; counter swaps instantly; timer digits do not flicker; no low-film blink |

Restore `CAMERA_OPEN_AT` afterwards.

- [ ] **Step 10: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/motion/shotTone.ts lib/motion/shotTone.test.ts components/motion components/screens/Camera.tsx
git commit -m "feat: camera motion - power-on, shutter blades, odometer, LCD timer, low film"
```

---

### Task 19: Preview motion — flash, reveal and film-advance filter swipe (moments 2 flash, 5, 6)

**Files:**
- Create: `lib/motion/typing.ts`, `lib/motion/typing.test.ts`
- Modify: `lib/image/compose.ts` (replace `drawOverlay` and `composeFrame`; add `drawLiveText`)
- Modify: `components/screens/Preview.tsx` (full replacement)

**Interfaces:**
- Consumes: `MOMENTS`, `MOTION`, `EASE`, `REVEAL` (17); `prefersReducedMotion` (17); `FILTERS`, `ensureFrameFonts`, `encodeJpeg`, `canvasToBlob`, `savePhoto`, `formatShot`, `formatStamp`, `formatFileName` (main plan).
- Produces:
  - `typingSteps(length: number, steps: number): number[]`
  - `type ComposeOptions = { liveText?: boolean }`; `composeFrame(canvas, input, opts?: ComposeOptions): void` (unchanged when `opts` is omitted)
  - `drawLiveText(ctx: CanvasRenderingContext2D, input: Pick<ComposeInput, 'shotLabel' | 'stamp'>, shown?: { shot: number; stamp: number }): void`
  - `Preview` props are unchanged from the main plan.

- [ ] **Step 1: Write the failing test**

`lib/motion/typing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/motion/typing.test.ts`
Expected: FAIL, cannot resolve `@/lib/motion/typing`.

- [ ] **Step 3: Implement `lib/motion/typing.ts`**

```ts
/** Characters shown at each typing step; the last step always shows the whole text. */
export function typingSteps(length: number, steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => Math.ceil(((i + 1) * length) / steps));
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/motion/typing.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Split live text out of `lib/image/compose.ts`**

Replace the existing `drawOverlay` function with the two functions below. The shot label is now drawn left-aligned from `rightX - width`, which puts it in the same place as before, so the saved JPEG does not change.

```ts
function drawOverlay(ctx: CanvasRenderingContext2D, input: ComposeInput, liveText: boolean) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = 'alphabetic';

  drawBrackets(ctx);
  drawBattery(ctx);

  ctx.font = TEXT.nf26.font;
  ctx.fillStyle = COLORS.overlay;
  ctx.textAlign = 'left';
  ctx.fillText(TEXT.nf26.text, TEXT.nf26.x, TEXT.nf26.y);

  // The bolt sits left of the full shot label, even while the label is still typing in.
  ctx.font = TEXT.shot.font;
  const shotWidth = ctx.measureText(input.shotLabel).width;
  drawBolt(ctx, TEXT.shot.rightX - shotWidth - TEXT.bolt.gap - TEXT.bolt.width, TEXT.shot.y - TEXT.bolt.height + 10);

  ctx.font = TEXT.hashtag.font;
  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'right';
  ctx.fillText(TEXT.hashtag.text, TEXT.hashtag.rightX, TEXT.hashtag.y);
  ctx.restore();

  if (liveText) drawLiveText(ctx, input);
}

/**
 * Draws the per-photo text: shot counter (top right) and capture time (bottom left).
 * `shown` limits how many characters of each are drawn, for the reveal's typing effect.
 */
export function drawLiveText(
  ctx: CanvasRenderingContext2D,
  input: Pick<ComposeInput, 'shotLabel' | 'stamp'>,
  shown: { shot: number; stamp: number } = { shot: input.shotLabel.length, stamp: input.stamp.length },
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  ctx.font = TEXT.shot.font;
  ctx.fillStyle = COLORS.overlay;
  const shotLeft = TEXT.shot.rightX - ctx.measureText(input.shotLabel).width;
  ctx.fillText(input.shotLabel.slice(0, shown.shot), shotLeft, TEXT.shot.y);

  ctx.font = TEXT.stamp.font;
  ctx.fillStyle = COLORS.green;
  ctx.fillText(input.stamp.slice(0, shown.stamp), TEXT.stamp.x, TEXT.stamp.y);
  ctx.restore();
}
```

Replace the existing `composeFrame` function with:

```ts
export type ComposeOptions = { liveText?: boolean };

/**
 * Draws the full 1320×1920 framed photo. `input.photo` must be 1200×1600 (see captureFrame).
 * `liveText: false` leaves out the shot counter and capture time, so Preview can type them in.
 */
export function composeFrame(canvas: HTMLCanvasElement, input: ComposeInput, opts: ComposeOptions = {}): void {
  canvas.width = OUT.width;
  canvas.height = OUT.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = COLORS.card;
  ctx.fillRect(0, 0, OUT.width, OUT.height);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height, PHOTO.radius);
  ctx.clip();
  ctx.drawImage(renderPhoto(input), PHOTO.x, PHOTO.y);
  ctx.restore();

  const half = PHOTO.border / 2;
  ctx.save();
  ctx.lineWidth = PHOTO.border;
  ctx.strokeStyle = COLORS.gold;
  ctx.beginPath();
  ctx.roundRect(PHOTO.x + half, PHOTO.y + half, PHOTO.width - PHOTO.border, PHOTO.height - PHOTO.border, PHOTO.radius - half);
  ctx.stroke();
  ctx.restore();

  drawOverlay(ctx, input, opts.liveText ?? true);
  drawBand(ctx);
}
```

- [ ] **Step 6: Confirm the frame output is unchanged**

Run: `npm run dev` and open `http://localhost:3000/dev/frame`.
Expected: the five cards look exactly as before this change: "07/15" right-aligned beside the gold bolt, green `'26 12 08 21:04` bottom-left.

- [ ] **Step 7: Replace `components/screens/Preview.tsx`**

Changes from the main plan's Task 14 version: a white flash on mount (the second half of the shutter); the card drops in, then the shot counter and timestamp type in; a filter change slides the card in from the swipe direction with a small overshoot; an LCD-style filter name above the chips. The canvas no longer dims while rendering.

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { composeFrame, drawLiveText } from '@/lib/image/compose';
import { canvasToBlob, encodeJpeg } from '@/lib/image/encode';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
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
  onConfirm: (input: { photoId: string; bytes: ArrayBuffer }) => Promise<void>;
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
```

- [ ] **Step 8: Check in the browser**

Same setup as Task 18 Step 9. Compare with the boards 02, 05 and 06, or `02-Shutter.mp4`, `05-Reveal.mp4` and `06-Filter.mp4`.

| Check | Expected |
| --- | --- |
| Shutter | Blades on the camera, then a short white flash as Preview opens |
| Preview opens | Card fades and settles from slightly larger; "07/15"-style counter and green time type in left to right; Confirm enables when typing ends (about 0.4 s) |
| Swipe left | Next filter slides in from the right and snaps with a small bounce; the filter name rolls up like an LCD menu |
| Swipe right, or tap an earlier chip | Card slides in from the left |
| Confirm, then check the file in Drive | Counter and time are complete and in the same place as on `/dev/frame` |
| Tap a chip during the typing | Typing stops; the new filter shows with full text |
| Reduced motion emulated | Flash is half strength; card fades in over 150 ms with text already complete; filter change is a quick fade |

- [ ] **Step 9: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/motion/typing.ts lib/motion/typing.test.ts lib/image/compose.ts components/screens/Preview.tsx
git commit -m "feat: preview flash, typed reveal and film-advance filter swipe"
```

---

### Task 20: Confirm — the photo flies into the thumbnail (moment 7)

**Files:**
- Create: `lib/motion/flip.ts`, `lib/motion/flip.test.ts`, `components/motion/FlyToThumb.tsx`
- Modify: `components/screens/Preview.tsx` (`onConfirm` gains the card's on-screen box), `components/CandidCamApp.tsx`

**Interfaces:**
- Consumes: `MOMENTS`, `MOTION`, `EASE` (17); `prefersReducedMotion` (17); `Camera`'s `thumbBumpKey` prop and `data-roll-thumb` attribute (18).
- Produces:
  - `type Box = { left: number; top: number; width: number; height: number }`; `flyTransform(from: Box, to: Box): { dx: number; dy: number; scale: number }` (with `transform-origin` at the top left)
  - `FlyToThumb({ src, from, onDone }: { src: string; from: Box; onDone(): void })`
  - `Preview` prop `onConfirm: (input: { photoId: string; bytes: ArrayBuffer; box: Box }) => Promise<void>`

- [ ] **Step 1: Write the failing test**

`lib/motion/flip.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/motion/flip.test.ts`
Expected: FAIL, cannot resolve `@/lib/motion/flip`.

- [ ] **Step 3: Implement `lib/motion/flip.ts`**

```ts
export type Box = { left: number; top: number; width: number; height: number };

/** Translate and scale that land `from` centred inside `to`. Use with transform-origin: top left. */
export function flyTransform(from: Box, to: Box): { dx: number; dy: number; scale: number } {
  const scale = Math.min(to.width / from.width, to.height / from.height);
  return {
    dx: to.left + (to.width - from.width * scale) / 2 - from.left,
    dy: to.top + (to.height - from.height * scale) / 2 - from.top,
    scale,
  };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/motion/flip.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Create `components/motion/FlyToThumb.tsx`**

```tsx
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
```

- [ ] **Step 6: Pass the card's box from `components/screens/Preview.tsx`**

Add the import:

```tsx
import type { Box } from '@/lib/motion/flip';
```

Replace the `onConfirm` line in `type Props` with:

```tsx
  onConfirm: (input: { photoId: string; bytes: ArrayBuffer; box: Box }) => Promise<void>;
```

Replace the `confirm` function with:

```tsx
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
```

- [ ] **Step 7: Wire the flight in `components/CandidCamApp.tsx`**

Add the imports:

```tsx
import { FlyToThumb } from '@/components/motion/FlyToThumb';
import type { Box } from '@/lib/motion/flip';
```

Add this state below `const [capture, setCapture] = useState<Capture | null>(null);`:

```tsx
  const [fly, setFly] = useState<{ src: string; from: Box } | null>(null);
  const [thumbBump, setThumbBump] = useState(0);
```

In the `<Camera … />` element, add the prop after `onExit={() => dispatch({ type: 'EXIT' })}`:

```tsx
            thumbBumpKey={thumbBump}
```

Replace the `<Preview>`'s `onConfirm` prop with:

```tsx
          onConfirm={async ({ photoId, bytes, box }) => {
            await queue.add({ photoId, capturedAt: capture.capturedAt.toISOString(), bytes });
            setFly({ src: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })), from: box });
            setCapture(null);
            dispatch({ type: 'CONFIRMED' });
          }}
```

Add this as the last child of the returned fragment, after the `blocked` block:

```tsx
      {fly && (
        <FlyToThumb
          src={fly.src}
          from={fly.from}
          onDone={() => {
            URL.revokeObjectURL(fly.src);
            setFly(null);
            setThumbBump((n) => n + 1);
          }}
        />
      )}
```

- [ ] **Step 8: Check in the browser**

Same setup as Task 18 Step 9. Compare with board 07 or `07-Confirm.mp4`.

| Check | Expected |
| --- | --- |
| Confirm | Camera shows; the framed photo shrinks from where the card was into the bottom-left thumbnail; the thumbnail bumps once; the counter rolls down by one |
| Tap the shutter during the flight | A new shot is taken at once (the flight does not block input) |
| Confirm on a narrow and a wide window | The photo always lands on the thumbnail |
| Reduced motion emulated | The photo fades out in place over 150 ms; no bump |

- [ ] **Step 9: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/motion/flip.ts lib/motion/flip.test.ts components/motion/FlyToThumb.tsx components/screens/Preview.tsx components/CandidCamApp.tsx
git commit -m "feat: confirmed photo flies into the My Roll thumbnail"
```

---

### Task 21: Upload status badges on My Roll (moment 8)

**Files:**
- Create: `lib/motion/badge.ts`, `lib/motion/badge.test.ts`, `components/motion/StatusBadge.tsx`
- Modify: `components/screens/Roll.tsx`

**Interfaces:**
- Consumes: `PhotoRecord`, `PhotoStatus` (main plan Task 8); CSS classes `m-badge-*` and colours `amber`, `alert` (17).
- Produces:
  - `type BadgeKind = 'developing' | 'sending' | 'saved' | 'retrying' | 'waiting' | 'not_sent'`; `type Badge = { kind: BadgeKind; label: string }`
  - `badgeFor(r: Pick<PhotoRecord, 'status' | 'lastError'>, progress?: number): Badge`
  - `shouldStamp(prev: PhotoStatus | undefined, next: PhotoStatus): boolean`
  - `StatusBadge({ badge, stamp }: { badge: Badge; stamp?: boolean })`

- [ ] **Step 1: Write the failing test**

`lib/motion/badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { badgeFor, shouldStamp } from '@/lib/motion/badge';

describe('badgeFor', () => {
  it('maps each upload status to a badge', () => {
    expect(badgeFor({ status: 'developing' })).toEqual({ kind: 'developing', label: 'Developing' });
    expect(badgeFor({ status: 'sending' })).toEqual({ kind: 'sending', label: 'Sending' });
    expect(badgeFor({ status: 'sending' }, 0.426)).toEqual({ kind: 'sending', label: 'Sending 43%' });
    expect(badgeFor({ status: 'saved' })).toEqual({ kind: 'saved', label: 'Saved' });
    expect(badgeFor({ status: 'retrying', lastError: 'network' })).toEqual({ kind: 'retrying', label: 'Retrying' });
    expect(badgeFor({ status: 'retrying', lastError: 'consent_required' })).toEqual({ kind: 'waiting', label: 'Waiting for consent' });
    expect(badgeFor({ status: 'not_sent', lastError: 'device_cap' })).toEqual({ kind: 'not_sent', label: 'Not sent · shot refunded' });
  });
});

describe('shouldStamp', () => {
  it('stamps only when a photo turns saved while the roll is open', () => {
    expect(shouldStamp('sending', 'saved')).toBe(true);
    expect(shouldStamp('retrying', 'saved')).toBe(true);
    expect(shouldStamp(undefined, 'saved')).toBe(false);
    expect(shouldStamp('saved', 'saved')).toBe(false);
    expect(shouldStamp('developing', 'sending')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/motion/badge.test.ts`
Expected: FAIL, cannot resolve `@/lib/motion/badge`.

- [ ] **Step 3: Implement `lib/motion/badge.ts`**

```ts
import type { PhotoRecord, PhotoStatus } from '@/lib/queue/policy';

export type BadgeKind = 'developing' | 'sending' | 'saved' | 'retrying' | 'waiting' | 'not_sent';
export type Badge = { kind: BadgeKind; label: string };

export function badgeFor(r: Pick<PhotoRecord, 'status' | 'lastError'>, progress?: number): Badge {
  switch (r.status) {
    case 'developing':
      return { kind: 'developing', label: 'Developing' };
    case 'sending':
      return { kind: 'sending', label: progress === undefined ? 'Sending' : `Sending ${Math.round(progress * 100)}%` };
    case 'saved':
      return { kind: 'saved', label: 'Saved' };
    case 'retrying':
      return r.lastError === 'consent_required'
        ? { kind: 'waiting', label: 'Waiting for consent' }
        : { kind: 'retrying', label: 'Retrying' };
    case 'not_sent':
      return { kind: 'not_sent', label: 'Not sent · shot refunded' };
  }
}

/** The saved stamp plays when a photo turns saved while My Roll is open, not for photos already saved. */
export function shouldStamp(prev: PhotoStatus | undefined, next: PhotoStatus): boolean {
  return prev !== undefined && prev !== 'saved' && next === 'saved';
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/motion/badge.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Create `components/motion/StatusBadge.tsx`**

Oswald is loaded at 400 and 500 only (main plan Task 1), so badges use `font-medium`, not `font-semibold`.

```tsx
import type { Badge, BadgeKind } from '@/lib/motion/badge';

const STYLE: Record<BadgeKind, { pill: string; dot: string }> = {
  developing: { pill: 'bg-body text-[#C9C0B2]', dot: 'm-badge-pulse bg-[#C9C0B2]' },
  sending: { pill: 'bg-body text-paper', dot: 'bg-gold' },
  saved: { pill: 'bg-[#142B12] text-green', dot: '' },
  retrying: { pill: 'bg-[#2B2110] text-amber', dot: 'm-badge-blink bg-amber' },
  waiting: { pill: 'bg-[#2B2110] text-amber', dot: 'bg-amber' },
  not_sent: { pill: 'bg-[#2E1412] text-alert', dot: 'bg-alert' },
};

/** Upload status pill (moment 8). `stamp` plays the saved stamp once; give the badge a new key to replay it. */
export function StatusBadge({ badge, stamp = false }: { badge: Badge; stamp?: boolean }) {
  const s = STYLE[badge.kind];
  return (
    <span className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex min-h-6 origin-left items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-xs font-medium uppercase tracking-wider ${s.pill} ${
          stamp && badge.kind === 'saved' ? 'm-badge-stamp' : ''
        }`}
      >
        {badge.kind === 'saved' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6" />
          </svg>
        ) : (
          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
        )}
        {badge.label}
      </span>
      {badge.kind === 'sending' && (
        <span aria-hidden="true" className="block h-[3px] w-24 overflow-hidden rounded-sm bg-[#2A241E]">
          <span className="m-badge-march block h-full w-[136px] bg-[repeating-linear-gradient(90deg,#D4AF37_0_10px,transparent_10px_20px)]" />
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 6: Use the badge in `components/screens/Roll.tsx`**

Replace the import block with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/motion/StatusBadge';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { badgeFor, shouldStamp } from '@/lib/motion/badge';
import { shotsUsed, type PhotoRecord, type PhotoStatus } from '@/lib/queue/policy';
import { formatFileName, formatStamp } from '@/lib/shared/time';
```

Delete the `statusLabel` function. Replace the `RollItem` component with:

```tsx
function RollItem({ record, progress }: { record: PhotoRecord; progress: number | undefined }) {
  const url = useObjectUrl(record.photoId, record.bytes);
  const prevStatus = useRef<PhotoStatus | undefined>(undefined);
  const [stampKey, setStampKey] = useState(0);
  const capturedAt = new Date(record.capturedAt);

  useEffect(() => {
    if (shouldStamp(prevStatus.current, record.status)) setStampKey((k) => k + 1);
    prevStatus.current = record.status;
  }, [record.status]);

  return (
    <li className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Photo taken ${formatStamp(capturedAt)}`} className="aspect-[1320/1920] w-full rounded-md object-cover" />
      ) : (
        <div className="aspect-[1320/1920] w-full rounded-md bg-body" />
      )}
      <StatusBadge key={stampKey} badge={badgeFor(record, progress)} stamp={stampKey > 0} />
      <button
        type="button"
        onClick={() => void savePhoto(new Blob([record.bytes], { type: 'image/jpeg' }), formatFileName(capturedAt, record.photoId))}
        className="min-h-11 font-label text-sm text-gold underline underline-offset-4"
      >
        Save to phone
      </button>
    </li>
  );
}
```

`Roll` itself is unchanged.

- [ ] **Step 7: Check in the browser**

Same setup as Task 18 Step 9. Compare with board 08 or `08-Badges.mp4`.

| Check | Expected |
| --- | --- |
| Confirm a photo and open My Roll at once | "Developing" with a slow pulsing dot, then "Sending 40%"-style label with a marching gold strip, then "Saved" stamps in with a check |
| Open My Roll after photos are already saved | "Saved" badges show without the stamp |
| DevTools › Network › Offline, confirm a photo | "Retrying" in amber with a dot blinking once a second |
| Reduced motion emulated | Badges show their label and colour with no pulse, march, blink or stamp |

- [ ] **Step 8: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/motion/badge.ts lib/motion/badge.test.ts components/motion/StatusBadge.tsx components/screens/Roll.tsx
git commit -m "feat: animated upload status badges on My Roll"
```

---

### Task 22: LCD channel switch between screens (moment 10)

**Files:**
- Create: `lib/motion/channelSwitch.ts`, `lib/motion/channelSwitch.test.ts`, `lib/app/useChannelSwitch.ts`
- Modify: `components/CandidCamApp.tsx`

**Interfaces:**
- Consumes: `Screen` (main plan Task 11); `MOMENTS` (17); `prefersReducedMotion` (17).
- Produces: `shouldWipe(from: Screen, to: Screen): boolean`; `useChannelSwitch(panel: RefObject<HTMLElement | null>, screen: Screen): void`

- [ ] **Step 1: Write the failing test**

`lib/motion/channelSwitch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shouldWipe } from '@/lib/motion/channelSwitch';

describe('shouldWipe', () => {
  it('wipes between ordinary screens', () => {
    expect(shouldWipe('welcome', 'notice')).toBe(true);
    expect(shouldWipe('access', 'camera')).toBe(true);
    expect(shouldWipe('camera', 'roll')).toBe(true);
    expect(shouldWipe('roll', 'blocked')).toBe(true);
  });

  it('leaves the shooting loop and repeats alone', () => {
    expect(shouldWipe('camera', 'preview')).toBe(false);
    expect(shouldWipe('preview', 'camera')).toBe(false);
    expect(shouldWipe('roll', 'roll')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/motion/channelSwitch.test.ts`
Expected: FAIL, cannot resolve `@/lib/motion/channelSwitch`.

- [ ] **Step 3: Implement `lib/motion/channelSwitch.ts`**

```ts
import type { Screen } from '@/lib/app/machine';

const SHOOTING: ReadonlySet<Screen> = new Set<Screen>(['camera', 'preview']);

/** Camera ↔ Preview has its own moments (shutter, reveal, confirm), so it gets no wipe. */
export function shouldWipe(from: Screen, to: Screen): boolean {
  if (from === to) return false;
  return !(SHOOTING.has(from) && SHOOTING.has(to));
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/motion/channelSwitch.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Implement `lib/app/useChannelSwitch.ts`**

The panel covers the new screen before the browser paints (layout effect), then slides left off-screen, revealing the new screen from the right edge with a scanline on the panel's edge.

```ts
'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Screen } from '@/lib/app/machine';
import { shouldWipe } from '@/lib/motion/channelSwitch';
import { prefersReducedMotion } from '@/lib/motion/reducedMotion';
import { MOMENTS } from '@/lib/motion/tokens';

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
```

- [ ] **Step 6: Add the panel to `components/CandidCamApp.tsx`**

Add the import:

```tsx
import { useChannelSwitch } from '@/lib/app/useChannelSwitch';
```

Add below `const tick = useNow(30_000);`:

```tsx
  const switchPanelRef = useRef<HTMLDivElement>(null);
  useChannelSwitch(switchPanelRef, state.screen);
```

Add this directly before the `{fly && (` block from Task 20. The panel rests off-screen through an inline `transform`; per the Global Constraints, do not use a Tailwind `-translate-x-full` class here.

```tsx
      <div
        ref={switchPanelRef}
        aria-hidden="true"
        style={{ transform: 'translateX(-100%)' }}
        className="pointer-events-none fixed inset-0 z-40 bg-ink"
      >
        <span className="absolute inset-y-0 right-0 w-[3px] bg-paper shadow-[0_0_14px_3px_rgba(245,240,230,0.55)]" />
      </div>
```

- [ ] **Step 7: Check in the browser**

Same setup as Task 18 Step 9. Compare with board 10 (slow-mo 0.25x) or `10-ScreenChange.mp4`.

| Check | Expected |
| --- | --- |
| Welcome → Notice → Access → Camera | Each change shows a quick right-to-left wipe with a bright line on its edge, 0.15 s |
| Camera → Preview → Camera | No wipe (blades, reveal and flight only) |
| Camera → My Roll → Back | Wipe both ways |
| Tap during a wipe | The tap reaches the new screen |
| Reduced motion emulated | A 150 ms fade from black instead of the wipe |

- [ ] **Step 8: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/motion/channelSwitch.ts lib/motion/channelSwitch.test.ts lib/app/useChannelSwitch.ts components/CandidCamApp.tsx
git commit -m "feat: LCD channel-switch wipe between screens"
```

---

### Task 23: Motion QA on phones and release checklist

**Files:**
- Modify: `docs/DEPLOY.md`

**Interfaces:**
- Consumes: Tasks 17–22 on a Netlify branch deploy.

- [ ] **Step 1: Run the full device check**

Push the branch and open the branch deploy with `?k=<EVENT_KEY>` (event window temporarily open on the branch, as in the main plan) on a real iPhone (Safari) and a mid-range Android (Chrome). Play `NF26-In-App-Motion-Reel.mp4` beside it for reference.

| Check | iPhone | Android |
| --- | --- | --- |
| All 10 moments look and time like the reel | ☐ | ☐ |
| 15 shots in a row as fast as possible: no stutter, no missed taps, counter ends at 00 | ☐ | ☐ |
| Self-timer group shot at night (front camera, screen flash on) | ☐ | ☐ |
| Confirm, lock the phone during the flight, unlock: camera is usable, thumbnail shows the photo | ☐ | ☐ |
| Reduced motion ON (iPhone: Settings › Accessibility › Motion › Reduce Motion; Android: Settings › Accessibility › Remove animations): every moment uses its fallback, nothing flickers | ☐ | ☐ |

- [ ] **Step 2: Check performance on the Android**

On the laptop: Chrome DevTools › Performance, CPU 4× slowdown, mobile size. Record: open camera (power-on), take 3 shots with confirm, open My Roll.
Expected: no long task over 50 ms during the shutter, reveal or flight. If the reveal typing shows long tasks, raise `REVEAL.typingStepMs` (keeping the token test passing) and re-check.

- [ ] **Step 3: Add motion to the release checklist in `docs/DEPLOY.md`**

Below the line `- [ ] Branch deploy tested on one iPhone and one Android`, add:

```markdown
- [ ] Motion checked against NF26-In-App-Motion-Reel.mp4 on both phones, including with Reduce Motion on (motion plan, Task 23)
```

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npm run lint && npm test
git add docs/DEPLOY.md
git commit -m "docs: add motion check to the release checklist"
```

---

## Spec coverage check

| Spec item (Motion section) | Covered by |
| --- | --- |
| 1 LCD power-on, once per session, tap skips, 600 ms | Task 18 (`PowerOn`) |
| 2 Shutter: blades 120 ms + flash 80 ms | Task 18 (blades), Task 19 (flash) |
| 3 EXP counter odometer, 250 ms | Task 18 (`Odometer`) |
| 4 Self-timer LCD digits, flicker, last-second pulse | Task 18 |
| 5 Preview reveal: drop then typed counter and time, 400 ms | Task 19 |
| 6 Filter swipe: film-advance with overshoot, LCD label | Task 19 |
| 7 Confirm: fly to thumbnail, bump, 350 ms | Tasks 18 (bump), 20 |
| 8 Upload badges: pulse, march, stamp, amber blink, static | Task 21 |
| 9 Low film: pink + 2 blinks at 3; FILM FULL, shutter dims at 0 | Task 18 |
| 10 Screen change: channel switch, 150 ms | Task 22 |
| Shared tokens | Task 17 (`tokens.ts`, `globals.css`) |
| Flicker ≤ 3 per second (target 2) | Task 17 (`flashesPerSecond` test on every blink schedule) |
| Reduced-motion fallback per moment | Task 17 (CSS), each task's checks, Task 23 |
| Transform and opacity only | All tasks; the wipe uses a sliding panel instead of clip-path |
| No sound | Nothing in this plan plays audio |
| Never block input | Overlays are `pointer-events: none`; power-on skips on tap; Task 20 Step 8, Task 22 Step 7 |
| Teaser | Not app code. Delivered as `NF26-Teaser-1080x1920.mp4`, rendered from the "NF'26 Motion" canvas; re-rendered on request when the board changes |
