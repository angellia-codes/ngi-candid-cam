'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { BlockReason } from '@/lib/camera/support';
import { formatWitaShort } from '@/lib/shared/time';

type Props = {
  reason: BlockReason;
  cameraOpenAt: Date | null;
  uploadCloseAt: Date | null;
  keyLink: string | null;
  onRetry: () => void;
  onOpenRoll: () => void;
};

export function Blocked({ reason, cameraOpenAt, uploadCloseAt, keyLink, onRetry, onOpenRoll }: Props) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  const copyLink = async () => {
    if (!keyLink) return;
    try {
      await navigator.clipboard.writeText(keyLink);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const copy: Record<BlockReason, { title: string; body: React.ReactNode; action?: React.ReactNode }> = {
    in_app: {
      title: 'Open in Safari or Chrome',
      body: "This app's built-in browser can't use the camera. Copy the link, then paste it into Safari or Chrome.",
      action: keyLink ? (
        <>
          <Button onClick={copyLink} className="w-full">
            {copied === 'done' ? 'Link copied' : 'Copy link'}
          </Button>
          {copied === 'failed' && <p className="select-all break-all text-sm text-muted">{keyLink}</p>}
        </>
      ) : null,
    },
    no_key: {
      title: 'Scan the QR code',
      body: 'Open the camera by scanning a NourishFest QR code at the venue.',
    },
    no_camera: {
      title: "This device can't open the camera",
      body: 'Try a phone with Safari or Chrome.',
    },
    denied: {
      title: 'Camera access is off',
      body: (
        <ul className="list-disc space-y-2 pl-5">
          <li>iPhone: tap aA in the address bar, then Website Settings, Camera, Allow. Reload the page.</li>
          <li>Android: tap the icon left of the address, then Permissions, Camera, Allow. Reload the page.</li>
        </ul>
      ),
      action: (
        <Button onClick={onRetry} className="w-full">
          Try again
        </Button>
      ),
    },
    busy: {
      title: 'Your camera is busy',
      body: 'Close other apps that use the camera, then try again.',
      action: (
        <Button onClick={onRetry} className="w-full">
          Try again
        </Button>
      ),
    },
    not_open: {
      title: cameraOpenAt ? `Camera opens ${formatWitaShort(cameraOpenAt)}` : 'Camera opens soon',
      body: 'Come back when NourishFest starts.',
    },
    closed: {
      title: 'The roll is closed',
      body: uploadCloseAt
        ? `Thanks for shooting. Photos still sending will keep trying until ${formatWitaShort(uploadCloseAt)}. Keep this page open.`
        : 'Thanks for shooting.',
      action: (
        <Button onClick={onOpenRoll} variant="ghost" className="w-full">
          View my roll
        </Button>
      ),
    },
  };

  const c = copy[reason];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">{c.title}</h1>
      <div className="leading-relaxed">{c.body}</div>
      {c.action && <div className="space-y-3">{c.action}</div>}
    </main>
  );
}
