import type { Screen } from '@/lib/app/machine';

const SHOOTING: ReadonlySet<Screen> = new Set<Screen>(['camera', 'preview']);

/** Camera ↔ Preview has its own moments (shutter, reveal, confirm), so it gets no wipe. */
export function shouldWipe(from: Screen, to: Screen): boolean {
  if (from === to) return false;
  return !(SHOOTING.has(from) && SHOOTING.has(to));
}
