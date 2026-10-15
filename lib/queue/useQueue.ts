'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { pendingCount, shotsUsed, type PhotoRecord } from '@/lib/queue/policy';
import { openPhotoStore, type PhotoStore } from '@/lib/queue/store';
import { UploadWorker } from '@/lib/queue/worker';
import { sendPhoto } from '@/lib/upload/client';

type Options = { consentVersion: string | null; uploadCloseAt: number | null; onConsentRequired: () => void };

export type QueueApi = {
  ready: boolean;
  storageError: string | null;
  records: PhotoRecord[];
  shotsUsed: number;
  pending: number;
  add(input: { photoId: string; capturedAt: string; bytes: ArrayBuffer }): Promise<void>;
  retryNow(): void;
  progress(photoId: string): number | undefined;
};

export function useQueue({ consentVersion, uploadCloseAt, onConsentRequired }: Options): QueueApi {
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const storeRef = useRef<PhotoStore | null>(null);
  const workerRef = useRef<UploadWorker | null>(null);
  const latest = useRef({ consentVersion, onConsentRequired });
  latest.current = { consentVersion, onConsentRequired };

  useEffect(() => {
    if (!consentVersion || uploadCloseAt === null) return;
    let disposed = false;

    (async () => {
      let store: PhotoStore;
      try {
        store = await openPhotoStore();
      } catch {
        setStorageError('This browser cannot store photos. Turn off private browsing, then reload.');
        return;
      }
      if (disposed) return;
      storeRef.current = store;
      const refresh = async () => {
        if (!disposed) setRecords(await store.all());
      };
      const worker = new UploadWorker({
        store,
        send: (rec, onProgress) => sendPhoto(rec, latest.current.consentVersion ?? '', onProgress),
        now: Date.now,
        uploadCloseAt,
        onChange: () => void refresh(),
        onProgress: rerender,
        onConsentRequired: () => latest.current.onConsentRequired(),
      });
      workerRef.current = worker;
      await worker.recover();
      await refresh();
      setReady(true);
      void worker.kick();
    })();

    const kick = () => void workerRef.current?.kick();
    const onVisible = () => {
      if (!document.hidden) kick();
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVisible);
      workerRef.current?.dispose();
      workerRef.current = null;
    };
  }, [consentVersion, uploadCloseAt]);

  const add = useCallback(async (input: { photoId: string; capturedAt: string; bytes: ArrayBuffer }) => {
    const store = storeRef.current;
    if (!store) throw new Error('Photo storage is not ready yet. Try again in a moment.');
    await store.put({ ...input, createdAt: Date.now(), status: 'developing', attempts: 0, nextAttemptAt: 0 });
    setRecords(await store.all());
    void workerRef.current?.kick();
  }, []);

  const retryNow = useCallback(() => void workerRef.current?.retryNow(), []);
  const progress = useCallback((photoId: string) => workerRef.current?.getProgress(photoId), []);

  return { ready, storageError, records, shotsUsed: shotsUsed(records), pending: pendingCount(records), add, retryNow, progress };
}
