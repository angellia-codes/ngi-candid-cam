export const QUALITY_STEPS = [0.82, 0.76, 0.7] as const;
export const SOFT_LIMIT_BYTES = 1_500_000;
export const HARD_LIMIT_BYTES = 3_000_000;

export async function encodeJpeg(toBlob: (quality: number) => Promise<Blob>): Promise<Blob> {
  let last: Blob | null = null;
  for (const q of QUALITY_STEPS) {
    last = await toBlob(q);
    if (last.size <= SOFT_LIMIT_BYTES) return last;
  }
  if (last && last.size <= HARD_LIMIT_BYTES) return last;
  throw new Error('Photo is too large to save. Please retake it.');
}

export function canvasToBlob(canvas: HTMLCanvasElement): (quality: number) => Promise<Blob> {
  return (quality) =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', quality),
    );
}
