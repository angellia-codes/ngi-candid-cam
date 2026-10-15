import {
  PAUSED,
  classifyResponse,
  nextDue,
  retryDelayMs,
  type PhotoRecord,
  type SendResult,
} from '@/lib/queue/policy';
import type { PhotoStore } from '@/lib/queue/store';

export type WorkerDeps = {
  store: PhotoStore;
  send: (rec: PhotoRecord, onProgress: (fraction: number) => void) => Promise<SendResult>;
  now: () => number;
  uploadCloseAt: number;
  onChange: () => void;
  onProgress?: () => void;
  onConsentRequired: () => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

/** Sends queued photos one at a time, oldest first, with timed retries. */
export class UploadWorker {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: unknown = null;
  private disposed = false;
  private readonly progress = new Map<string, number>();

  constructor(private readonly deps: WorkerDeps) {}

  getProgress(photoId: string): number | undefined {
    return this.progress.get(photoId);
  }

  async recover(): Promise<void> {
    for (const r of await this.deps.store.all()) {
      if (r.status === 'sending') await this.deps.store.put({ ...r, status: 'developing' });
    }
  }

  kick(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.processDue();
        } while (this.again && !this.disposed);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  async retryNow(): Promise<void> {
    const now = this.deps.now();
    for (const r of await this.deps.store.all()) {
      if (r.status === 'retrying') await this.deps.store.put({ ...r, nextAttemptAt: now });
    }
    this.deps.onChange();
    await this.kick();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private clearTimer() {
    if (this.timer !== null) {
      (this.deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
      this.timer = null;
    }
  }

  private schedule(records: PhotoRecord[]) {
    this.clearTimer();
    const waits = records.filter((r) => r.status === 'retrying' && r.nextAttemptAt !== PAUSED).map((r) => r.nextAttemptAt);
    if (!waits.length || this.disposed) return;
    const ms = Math.max(0, Math.min(...waits) - this.deps.now());
    this.timer = (this.deps.setTimer ?? setTimeout)(() => {
      this.timer = null;
      void this.kick();
    }, ms);
  }

  private async processDue(): Promise<void> {
    const { store } = this.deps;
    for (;;) {
      if (this.disposed) return;
      const records = await store.all();
      const now = this.deps.now();
      const due = nextDue(records, now);
      if (!due) {
        this.schedule(records);
        return;
      }

      if (now > this.deps.uploadCloseAt) {
        await store.put({ ...due, status: 'not_sent', lastError: 'window_closed' });
        this.deps.onChange();
        continue;
      }

      await store.put({ ...due, status: 'sending' });
      this.progress.set(due.photoId, 0);
      this.deps.onChange();

      let result: SendResult;
      try {
        result = await this.deps.send(due, (fraction) => {
          this.progress.set(due.photoId, fraction);
          this.deps.onProgress?.();
        });
      } catch {
        result = { status: null };
      }
      this.progress.delete(due.photoId);

      const attempts = due.attempts + 1;
      const outcome = classifyResponse(result.status, result.code);
      if (outcome.kind === 'saved') {
        await store.put({ ...due, status: 'saved', attempts, lastError: undefined });
      } else if (outcome.kind === 'retry') {
        await store.put({
          ...due,
          status: 'retrying',
          attempts,
          nextAttemptAt: this.deps.now() + retryDelayMs(attempts),
          lastError: outcome.reason,
        });
      } else if (outcome.kind === 'consent') {
        await store.put({ ...due, status: 'retrying', attempts, nextAttemptAt: PAUSED, lastError: 'consent_required' });
        this.deps.onConsentRequired();
      } else {
        await store.put({ ...due, status: 'not_sent', attempts, lastError: outcome.code });
      }
      this.deps.onChange();
    }
  }
}
