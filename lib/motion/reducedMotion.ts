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
