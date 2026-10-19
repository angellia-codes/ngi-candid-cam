'use client';

import { useEffect, useRef, useState } from 'react';

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

/** Two-digit counter that rolls up to its new value (spec moment 3). */
export function Odometer({ value }: { value: number }) {
  const prev = useRef(value);
  const [roll, setRoll] = useState<{ from: number; to: number; key: number } | null>(null);

  useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current;
    prev.current = value;
    setRoll((r) => ({ from, to: value, key: (r?.key ?? 0) + 1 }));
  }, [value]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-block h-[1.2em] overflow-hidden align-bottom leading-[1.2em] tabular-nums">
        {roll ? (
          <span key={roll.key} className="m-odo flex flex-col">
            <span>{pad(roll.from)}</span>
            <span>{pad(roll.to)}</span>
          </span>
        ) : (
          <span className="block">{pad(value)}</span>
        )}
      </span>
    </>
  );
}
