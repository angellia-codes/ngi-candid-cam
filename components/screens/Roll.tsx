'use client';

import { Button } from '@/components/ui/Button';
import { savePhoto } from '@/lib/client/save';
import { useObjectUrl } from '@/lib/client/useObjectUrl';
import { shotsUsed, type PhotoRecord } from '@/lib/queue/policy';
import { formatFileName, formatStamp } from '@/lib/shared/time';

type Props = {
  records: PhotoRecord[];
  total: number;
  progress: (photoId: string) => number | undefined;
  onClose: () => void;
  onRetryNow: () => void;
};

function statusLabel(r: PhotoRecord, progress: number | undefined): { text: string; tone: string } {
  switch (r.status) {
    case 'developing':
      return { text: 'Developing', tone: 'text-cream' };
    case 'sending':
      return { text: progress === undefined ? 'Sending' : `Sending ${Math.round(progress * 100)}%`, tone: 'text-gold' };
    case 'saved':
      return { text: 'Saved ✓', tone: 'text-green' };
    case 'retrying':
      return { text: r.lastError === 'consent_required' ? 'Waiting for consent' : 'Retrying', tone: 'text-gold' };
    case 'not_sent':
      return { text: 'Not sent · shot refunded', tone: 'text-pink' };
  }
}

function RollItem({ record, progress }: { record: PhotoRecord; progress: number | undefined }) {
  const url = useObjectUrl(record.photoId, record.bytes);
  const label = statusLabel(record, progress);
  const capturedAt = new Date(record.capturedAt);
  return (
    <li className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Photo taken ${formatStamp(capturedAt)}`} className="aspect-[1320/1920] w-full rounded-md object-cover" />
      ) : (
        <div className="aspect-[1320/1920] w-full rounded-md bg-body" />
      )}
      <p className={`font-label text-sm ${label.tone}`}>{label.text}</p>
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
