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
