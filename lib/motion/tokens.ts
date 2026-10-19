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
