import { describe, expect, it } from 'vitest';
import { badgeFor, shouldStamp } from '@/lib/motion/badge';

describe('badgeFor', () => {
  it('maps each upload status to a badge', () => {
    expect(badgeFor({ status: 'developing' })).toEqual({ kind: 'developing', label: 'Developing' });
    expect(badgeFor({ status: 'sending' })).toEqual({ kind: 'sending', label: 'Sending' });
    expect(badgeFor({ status: 'sending' }, 0.426)).toEqual({ kind: 'sending', label: 'Sending 43%' });
    expect(badgeFor({ status: 'saved' })).toEqual({ kind: 'saved', label: 'Saved' });
    expect(badgeFor({ status: 'retrying', lastError: 'network' })).toEqual({ kind: 'retrying', label: 'Retrying' });
    expect(badgeFor({ status: 'retrying', lastError: 'consent_required' })).toEqual({ kind: 'waiting', label: 'Waiting for consent' });
    expect(badgeFor({ status: 'not_sent', lastError: 'device_cap' })).toEqual({ kind: 'not_sent', label: 'Not sent · shot refunded' });
  });
});

describe('shouldStamp', () => {
  it('stamps only when a photo turns saved while the roll is open', () => {
    expect(shouldStamp('sending', 'saved')).toBe(true);
    expect(shouldStamp('retrying', 'saved')).toBe(true);
    expect(shouldStamp(undefined, 'saved')).toBe(false);
    expect(shouldStamp('saved', 'saved')).toBe(false);
    expect(shouldStamp('developing', 'sending')).toBe(false);
  });
});
