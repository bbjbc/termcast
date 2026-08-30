'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { MAX_CODE, encodeTape } from '@/lib/encode';

const subscribe = () => () => {};

/**
 * Compress the tape into an address. A link is then self-contained, with no store
 * and no database, at the cost of a ceiling: past it we point people at the file.
 */
export function useTapeUrl(source: string) {
  const [code, setCode] = useState('');

  // The server cannot know the origin. useSyncExternalStore gives it an empty
  // server snapshot and the real value on the client, without an effect that
  // would set state during the first commit.
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => '');

  useEffect(() => {
    let live = true;
    encodeTape(source)
      .then((next) => { if (live) setCode(next); })
      .catch(() => { if (live) setCode(''); });
    return () => { live = false; };
  }, [source]);

  const tooLong = code.length > MAX_CODE;
  const url = origin && code && !tooLong ? `${origin}/t/${code}.svg` : '';

  return { code, url, tooLong, pending: !code && !tooLong };
}
