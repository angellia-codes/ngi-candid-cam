import { COOKIE_DEVICE, COOKIE_KEY, parseCookieString, serializeCookie } from '@/lib/shared/cookies';

const THREE_DAYS = 3 * 24 * 60 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export function takeEventKeyFromUrl(href: string): { key: string | null; cleanUrl: string } {
  const url = new URL(href);
  const raw = url.searchParams.get('k');
  url.searchParams.delete('k');
  const key = raw && raw.trim() ? raw.trim() : null;
  return { key, cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}

export function initIdentity(win: Window = window): { hasKey: boolean; keyLink: string | null } {
  const secure = win.location.protocol === 'https:';
  const { key, cleanUrl } = takeEventKeyFromUrl(win.location.href);
  if (key) {
    win.document.cookie = serializeCookie(COOKIE_KEY, key, THREE_DAYS, secure);
    win.history.replaceState(win.history.state, '', cleanUrl);
  }
  if (!parseCookieString(win.document.cookie)[COOKIE_DEVICE]) {
    win.document.cookie = serializeCookie(COOKIE_DEVICE, crypto.randomUUID(), THIRTY_DAYS, secure);
  }
  const stored = parseCookieString(win.document.cookie)[COOKIE_KEY] ?? null;
  return {
    hasKey: Boolean(stored),
    keyLink: stored ? `${win.location.origin}/?k=${encodeURIComponent(stored)}` : null,
  };
}
