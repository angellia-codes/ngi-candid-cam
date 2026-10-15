export const OUT = { width: 1320, height: 1920 } as const;
export const PHOTO = { x: 60, y: 60, width: 1200, height: 1600, radius: 28, border: 4 } as const;

export const COLORS = {
  card: '#EDE6D6',
  ink: '#0D0D0D',
  gold: '#D4AF37',
  pink: '#FF1B6B',
  green: '#39FF14',
  overlay: '#F5F0E6',
} as const;

export const BRACKET = { inset: 44, arm: 76, stroke: 6 } as const;

export const TEXT = {
  battery: { x: 208, y: 124, width: 60, height: 36 },
  nf26: { x: 300, y: 156, font: '500 40px Oswald', text: 'NF26' },
  shot: { rightX: 1112, y: 160, font: '500 48px Oswald' },
  bolt: { width: 32, height: 56, gap: 20 },
  stamp: { x: 208, y: 1604, font: '500 40px Oswald' },
  hashtag: { rightX: 1112, y: 1604, font: '500 36px Oswald', text: '#MoveInUnity' },
  title: { x: 60, y: 1764, font: '400 80px Bungee', text: 'NOURISHFEST' },
  year: { x: 60, y: 1848, font: '400 48px Bungee', text: '2026' },
  date: { gap: 40, y: 1848, font: '500 40px Oswald', text: '08.12.2026' },
} as const;
