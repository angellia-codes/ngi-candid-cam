import type { PhotoRecord, PhotoStatus } from '@/lib/queue/policy';

export type BadgeKind = 'developing' | 'sending' | 'saved' | 'retrying' | 'waiting' | 'not_sent';
export type Badge = { kind: BadgeKind; label: string };

export function badgeFor(r: Pick<PhotoRecord, 'status' | 'lastError'>, progress?: number): Badge {
  switch (r.status) {
    case 'developing':
      return { kind: 'developing', label: 'Developing' };
    case 'sending':
      return { kind: 'sending', label: progress === undefined ? 'Sending' : `Sending ${Math.round(progress * 100)}%` };
    case 'saved':
      return { kind: 'saved', label: 'Saved' };
    case 'retrying':
      return r.lastError === 'consent_required'
        ? { kind: 'waiting', label: 'Waiting for consent' }
        : { kind: 'retrying', label: 'Retrying' };
    case 'not_sent':
      return { kind: 'not_sent', label: 'Not sent · shot refunded' };
  }
}

/** The saved stamp plays when a photo turns saved while My Roll is open, not for photos already saved. */
export function shouldStamp(prev: PhotoStatus | undefined, next: PhotoStatus): boolean {
  return prev !== undefined && prev !== 'saved' && next === 'saved';
}
