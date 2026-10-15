const FRAME_FONTS = ['400 80px Bungee', '400 48px Bungee', '500 40px Oswald'] as const;

let ready: Promise<void> | null = null;

/** Canvas draws with whatever is loaded at that moment, so load the frame fonts first. */
export function ensureFrameFonts(): Promise<void> {
  ready ??= Promise.all(FRAME_FONTS.map((f) => document.fonts.load(f))).then((faces) => {
    if (faces.some((list) => list.length === 0)) console.warn('A frame font did not load; text will use a fallback face');
  });
  return ready;
}
