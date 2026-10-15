export type FilterId = 'original' | 'nf-film' | 'flash-mono' | 'gold-hour' | 'neon-night';
export type Filter = { id: FilterId; label: string; matrix: readonly number[] };

// Rows are R, G, B, A. Each row: [r, g, b, a, offset], offset in 0–255 units (same layout as SVG feColorMatrix ×255).
const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] as const;
const MONO = (gain: number, offset: number) => {
  const r = 0.299 * gain, g = 0.587 * gain, b = 0.114 * gain;
  return [r, g, b, 0, offset, r, g, b, 0, offset, r, g, b, 0, offset, 0, 0, 0, 1, 0] as const;
};

export const FILTERS: readonly Filter[] = [
  { id: 'original', label: 'Original', matrix: IDENTITY },
  // Warm, slightly faded, soft contrast
  { id: 'nf-film', label: 'NF Film', matrix: [0.92, 0.06, 0, 0, 18, 0.02, 0.88, 0.04, 0, 16, 0, 0.06, 0.78, 0, 14, 0, 0, 0, 1, 0] },
  // High-contrast black and white; hides night-time sensor noise
  { id: 'flash-mono', label: 'Flash Mono', matrix: MONO(1.25, -32) },
  // Boosted warm tones
  { id: 'gold-hour', label: 'Gold Hour', matrix: [1.12, 0.06, 0, 0, 6, 0.02, 1.02, 0, 0, 2, 0, 0, 0.82, 0, -4, 0, 0, 0, 1, 0] },
  // Cool shadows with a magenta tint
  { id: 'neon-night', label: 'Neon Night', matrix: [1.0, 0, 0.12, 0, 12, 0, 0.82, 0.06, 0, -4, 0.06, 0.04, 1.08, 0, 14, 0, 0, 0, 1, 0] },
];

function isIdentity(m: readonly number[]): boolean {
  return m.every((v, i) => v === IDENTITY[i]);
}

/** Applies the matrix in place to RGBA pixel data. Alpha is left unchanged. */
export function applyColorMatrix(data: Uint8ClampedArray, m: readonly number[]): void {
  if (isIdentity(m)) return;
  const [a0, a1, a2, , a4, b0, b1, b2, , b4, c0, c1, c2, , c4] = m as number[];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    data[i] = a0! * r + a1! * g + a2! * b + a4!;
    data[i + 1] = b0! * r + b1! * g + b2! * b + b4!;
    data[i + 2] = c0! * r + c1! * g + c2! * b + c4!;
  }
}
