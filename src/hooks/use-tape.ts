'use client';

import { useCallback, useMemo, useState } from 'react';

import { setDirective, tapeToSvg } from '@/lib/tapecast';

/**
 * The tape string is the app's single source of truth.
 * Even the settings panel mutates state only by writing directives into the tape,
 * so the form and the text can never disagree, and putting the tape in a URL
 * carries the entire state with it.
 */
export function useTape(initial: string) {
  const [source, setSource] = useState(initial);

  const result = useMemo(() => tapeToSvg(source), [source]);

  const patch = useCallback(
    (key: string, value: string | null) =>
      setSource((prev) => setDirective(prev, key, value)),
    [],
  );

  const load = useCallback((next: string) => setSource(next), []);

  const derived = useMemo(() => {
    const { svg } = result;
    return {
      bytes: new TextEncoder().encode(svg).length,
      width: Number(svg.match(/width="(\d+)"/)?.[1] ?? 0),
      // The preview must match README conditions, so it renders through <img>
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    };
  }, [result]);

  return { source, setSource, load, patch, ...result, ...derived };
}

export type TapeState = ReturnType<typeof useTape>;
