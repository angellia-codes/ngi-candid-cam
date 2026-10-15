export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/** Largest centred region of the source with the target aspect (width / height). */
export function coverCrop(srcW: number, srcH: number, targetAspect = 3 / 4): CropRect {
  if (srcW / srcH > targetAspect) {
    const sw = Math.round(srcH * targetAspect);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / targetAspect);
  return { sx: 0, sy: Math.round((srcH - sh) / 2), sw: srcW, sh };
}
