'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NOTICE_AGREE, NOTICE_EN, NOTICE_ID } from '@/lib/copy/notice';

export function Notice({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">Before you shoot</h1>
      <p className="leading-relaxed">{NOTICE_EN}</p>
      <p lang="id" className="leading-relaxed text-cream/75">
        {NOTICE_ID}
      </p>
      <a href="/privacy" className="font-label text-gold underline underline-offset-4">
        Read the full privacy notice
      </a>
      <label htmlFor="consent" className="flex min-h-12 items-start gap-3 rounded-xl border border-cream/20 p-4">
        <input
          id="consent"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-6 shrink-0 accent-[#D4AF37]"
        />
        <span>{NOTICE_AGREE}</span>
      </label>
      <Button onClick={onAccept} disabled={!agreed} className="mt-auto w-full">
        Continue
      </Button>
    </main>
  );
}
