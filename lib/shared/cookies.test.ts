import { describe, expect, it } from 'vitest';
import { parseCookieString, serializeCookie } from '@/lib/shared/cookies';

describe('cookies', () => {
  it('parses a cookie header', () => {
    expect(parseCookieString('nf26_key=abc; nf26_device=d-1;  other=x%20y')).toEqual({
      nf26_key: 'abc',
      nf26_device: 'd-1',
      other: 'x y',
    });
  });

  it('handles empty and malformed input', () => {
    expect(parseCookieString(null)).toEqual({});
    expect(parseCookieString('novalue; =x; a=%E0%A4%A')).toEqual({ a: '%E0%A4%A' });
  });

  it('serializes with safe defaults', () => {
    expect(serializeCookie('nf26_key', 'a b', 60, true)).toBe('nf26_key=a%20b; Max-Age=60; Path=/; SameSite=Lax; Secure');
    expect(serializeCookie('x', 'y', 1, false)).toBe('x=y; Max-Age=1; Path=/; SameSite=Lax');
  });
});
