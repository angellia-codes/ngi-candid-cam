/** Characters shown at each typing step; the last step always shows the whole text. */
export function typingSteps(length: number, steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => Math.ceil(((i + 1) * length) / steps));
}
