import { describe, expect, it } from 'vitest';
import { takeEventKeyFromUrl } from '@/lib/client/identity';

describe('takeEventKeyFromUrl', () => {
  it('extracts the key and removes it from the URL', () => {
    expect(takeEventKeyFromUrl('https://cam.example/?k=abc123&x=1#top')).toEqual({ key: 'abc123', cleanUrl: '/?x=1#top' });
  });
  it('returns null when there is no key', () => {
    expect(takeEventKeyFromUrl('https://cam.example/privacy')).toEqual({ key: null, cleanUrl: '/privacy' });
    expect(takeEventKeyFromUrl('https://cam.example/?k=%20')).toEqual({ key: null, cleanUrl: '/' });
  });
});
