export type ShotTone = 'normal' | 'low' | 'empty';

export const LOW_FILM_AT = 3;

export function shotTone(left: number): ShotTone {
  if (left <= 0) return 'empty';
  if (left <= LOW_FILM_AT) return 'low';
  return 'normal';
}

/** The low-film blink plays once, when the counter goes from normal to low. */
export function entersLowFilm(prev: number, next: number): boolean {
  return shotTone(prev) === 'normal' && shotTone(next) === 'low';
}
