import { describe, expect, it } from 'vitest';
import { acceptConsent, clearConsent, hasConsent } from '@/lib/client/consent';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

describe('consent', () => {
  it('remembers the accepted version only', () => {
    const s = memory();
    expect(hasConsent('2026-10-v1', s)).toBe(false);
    acceptConsent('2026-10-v1', s);
    expect(hasConsent('2026-10-v1', s)).toBe(true);
    expect(hasConsent('2026-11-v2', s)).toBe(false);
    clearConsent(s);
    expect(hasConsent('2026-10-v1', s)).toBe(false);
  });

  it('treats a storage error as no consent', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(hasConsent('2026-10-v1', broken)).toBe(false);
    expect(() => acceptConsent('2026-10-v1', broken)).not.toThrow();
  });
});
