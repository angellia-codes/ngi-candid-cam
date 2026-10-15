'use client';

import { useEffect, useState } from 'react';

/** Object URL for stored photo bytes. Keyed by photo ID so store refreshes don't recreate it. */
export function useObjectUrl(id: string | null, bytes: ArrayBuffer | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id || !bytes) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bytes for a photo ID never change
  }, [id]);
  return url;
}
