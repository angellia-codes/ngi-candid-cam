export type PhotoStatus = 'developing' | 'sending' | 'saved' | 'retrying' | 'not_sent';

export type PhotoRecord = {
  photoId: string;
  capturedAt: string;
  createdAt: number;
  bytes: ArrayBuffer;
  status: PhotoStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

export type SendResult = { status: number | null; code?: string };

export type UploadOutcome =
  | { kind: 'saved' }
  | { kind: 'retry'; reason: string }
  | { kind: 'consent' }
  | { kind: 'rejected'; code: string };

export const RETRY_DELAYS_S = [2, 5, 15, 30, 60] as const;
/** nextAttemptAt for photos waiting on the privacy notice. */
export const PAUSED = Number.MAX_SAFE_INTEGER;

export function retryDelayMs(attempts: number): number {
  const i = Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_S.length - 1);
  return RETRY_DELAYS_S[i]! * 1000;
}

export function classifyResponse(status: number | null, code?: string): UploadOutcome {
  if (status === null) return { kind: 'retry', reason: 'network' };
  if (status >= 200 && status < 300) return { kind: 'saved' };
  if (status >= 500) return { kind: 'retry', reason: code ?? `http_${status}` };
  if (code === 'consent_required') return { kind: 'consent' };
  return { kind: 'rejected', code: code ?? `http_${status}` };
}

/** `records` must be sorted oldest first (PhotoStore.all does this). */
export function nextDue(records: PhotoRecord[], now: number): PhotoRecord | undefined {
  return records.find((r) => r.status === 'developing' || (r.status === 'retrying' && r.nextAttemptAt <= now));
}

export function shotsUsed(records: PhotoRecord[]): number {
  return records.filter((r) => r.status !== 'not_sent').length;
}

export function pendingCount(records: PhotoRecord[]): number {
  return records.filter((r) => r.status === 'developing' || r.status === 'sending' || r.status === 'retrying').length;
}
