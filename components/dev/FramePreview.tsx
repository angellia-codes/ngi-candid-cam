'use client';

import { useEffect, useRef } from 'react';
import { composeFrame } from '@/lib/image/compose';
import { FILTERS } from '@/lib/image/filters';
import { ensureFrameFonts } from '@/lib/image/fonts';
import { formatShot, formatStamp } from '@/lib/shared/time';

function testPhoto(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1600;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 1600);
  g.addColorStop(0, '#2b1d3a');
  g.addColorStop(0.55, '#c8752a');
  g.addColorStop(1, '#1a120c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = '#f2e9d8';
  ctx.fillRect(0, 0, 1200, 120); // bright sky strip to check overlay legibility
  ctx.fillStyle = '#0b0806';
  ctx.beginPath();
  ctx.arc(420, 760, 150, 0, Math.PI * 2);
  ctx.arc(780, 700, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(250, 900, 340, 700);
  ctx.fillRect(620, 840, 320, 760);
  return c;
}

export function FramePreview() {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    void ensureFrameFonts().then(() => {
      const photo = testPhoto();
      FILTERS.forEach((filter, i) => {
        const canvas = refs.current[i];
        if (canvas) composeFrame(canvas, { photo, filter, shotLabel: formatShot(7, 15), stamp: formatStamp(new Date('2026-12-08T13:04:00Z')) });
      });
    });
  }, []);
  return (
    <main className="flex flex-wrap gap-6 p-6">
      {FILTERS.map((f, i) => (
        <figure key={f.id} className="w-[330px]">
          <canvas ref={(el) => { refs.current[i] = el; }} className="h-auto w-full" />
          <figcaption className="mt-2 font-label text-gold">{f.label}</figcaption>
        </figure>
      ))}
    </main>
  );
}
