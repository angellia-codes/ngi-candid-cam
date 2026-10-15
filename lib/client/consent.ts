const KEY = 'nf26.consent';

function storage(s?: Storage): Storage | null {
  if (s) return s;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasConsent(version: string, s?: Storage): boolean {
  try {
    return storage(s)?.getItem(KEY) === version;
  } catch {
    return false;
  }
}

export function acceptConsent(version: string, s?: Storage): void {
  try {
    storage(s)?.setItem(KEY, version);
  } catch {
    // Private mode: the notice will simply show again next visit.
  }
}

export function clearConsent(s?: Storage): void {
  try {
    storage(s)?.removeItem(KEY);
  } catch {
    // ignore
  }
}
