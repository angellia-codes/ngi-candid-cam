'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/motion/StatusBadge';
import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { badgeFor, shouldStamp } from '@/lib/motion/badge';
import { shotsUsed, type PhotoRecord, type PhotoStatus } from '@/lib/queue/policy';
import { formatFileName, formatStamp } from '@/lib/shared/time';

type Props = {
  records: PhotoRecord[];
  total: number;
  progress: (photoId: string) => number | undefined;
  onClose: () => void;
  onRetryNow: () => void;
};

function RollItem({ record, progress }: { record: PhotoRecord; progress: number | undefined }) {
  const url = useObjectUrl(record.photoId, record.bytes);
  const prevStatus = useRef<PhotoStatus | undefined>(undefined);
  const [stampKey, setStampKey] = useState(0);
  const capturedAt = new Date(record.capturedAt);

  useEffect(() => {
    if (shouldStamp(prevStatus.current, record.status)) setStampKey((k) => k + 1);
    prevStatus.current = record.status;
  }, [record.status]);

  return (
    <li className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Photo taken ${formatStamp(capturedAt)}`} className="aspect-[1320/1920] w-full rounded-md object-cover" />
      ) : (
        <div className="aspect-[1320/1920] w-full rounded-md bg-body" />
      )}
      <StatusBadge key={stampKey} badge={badgeFor(record, progress)} stamp={stampKey > 0} />
      <button
        type="button"
        onClick={() => void savePhoto(new Blob([record.bytes], { type: 'image/jpeg' }), formatFileName(capturedAt, record.photoId))}
        className="min-h-11 font-label text-sm text-gold underline underline-offset-4"
      >
        Save to phone
      </button>
    </li>
  );
}

export function Roll({ records, total, progress, onClose, onRetryNow }: Props) {
  const newestFirst = [...records].reverse();
  const anyRetrying = records.some((r) => r.status === 'retrying');
  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-5 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl text-cream">My Roll</h1>
        <p className="font-label text-muted">
          {shotsUsed(records)} of {total} shots used
        </p>
      </header>
      <p className="text-sm text-muted">
        Photos are kept in this browser, which may clear them later. Use Save to phone to keep your own copy.
      </p>

      {newestFirst.length === 0 ? (
        <p className="py-10 text-center font-label text-cream/70">No photos yet. Go shoot your first one.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {newestFirst.map((r) => (
            <RollItem key={r.photoId} record={r} progress={progress(r.photoId)} />
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 grid gap-3 bg-ink py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {anyRetrying && (
          <Button variant="ghost" onClick={onRetryNow}>
            Try sending now
          </Button>
        )}
        <Button onClick={onClose}>Back</Button>
      </div>
    </main>
  );
}
