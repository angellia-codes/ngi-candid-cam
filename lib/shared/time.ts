const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const p2 = (n: number) => String(n).padStart(2, '0');

function wita(d: Date) {
  const t = new Date(d.getTime() + WITA_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
  };
}

export function formatStamp(date: Date): string {
  const w = wita(date);
  return `'${p2(w.y % 100)} ${p2(w.mo)} ${p2(w.d)} ${p2(w.h)}:${p2(w.mi)}`;
}

export function formatFileName(date: Date, photoId: string): string {
  const w = wita(date);
  return `NF26_${w.y}${p2(w.mo)}${p2(w.d)}-${p2(w.h)}${p2(w.mi)}${p2(w.s)}_${photoId.slice(0, 8)}.jpg`;
}

export function formatShot(n: number, total: number): string {
  return `${p2(n)}/${p2(total)}`;
}

export function formatWitaShort(date: Date): string {
  const w = wita(date);
  return `${w.d} ${MONTHS[w.mo - 1]}, ${p2(w.h)}:${p2(w.mi)}`;
}
