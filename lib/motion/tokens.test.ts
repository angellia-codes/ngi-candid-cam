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
