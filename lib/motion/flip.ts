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
