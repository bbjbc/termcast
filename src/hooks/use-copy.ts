'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Flip to a confirmed state briefly. Where the clipboard is blocked, fail quietly. */
export function useCopy(hold = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), hold);
    } catch {
      setCopied(false);
    }
  }, [hold]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { copied, copy };
}
