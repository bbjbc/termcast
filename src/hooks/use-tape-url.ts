'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { embedFiles, embedFilesSnippet, embedPicture, embedSnippet } from '@/lib/embed';
import { MAX_CODE, encodeTape } from '@/lib/encode';
import { RENDERER_VERSION, build, parse, tapeToSvg } from '@/lib/tapecast';

const subscribe = () => () => {};

/**
 * Compress the tape into an address. A link is then self-contained, with no store
 * and no database, at the cost of a ceiling: past it we point people at the file.
 */
export function useTapeUrl(source: string, font: number) {
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
  // The renderer version rides in the path so that changing the renderer changes
  // the address, and a README that already points at one keeps what it was given.
  const url = origin && code && !tooLong
    ? `${origin}/t/v${RENDERER_VERSION}/${code}.svg`
    : '';

  // What goes in a GitHub README is a `<picture>` of one variant per viewport
  // class, so the reserved height follows the screen; the one-line `<img>`
  // reflows the same way and is the safe form for anywhere else. Both the
  // pasted form and the committed one ask how many rows the tape takes at a
  // width, so bands that reserve the same height collapse and a tape that
  // never wraps stays a single image.
  const snippet = url ? embedSnippet(origin, code, font) : '';
  const { picture, fileSet } = (() => {
    if (!url) return { picture: '', fileSet: null };
    const { cfg, cmds } = parse(source);
    const rows = (cols: number) => Math.max(build({ ...cfg, cols }, cmds).rows, cfg.rows);
    const files = embedFiles(font, rows);
    return {
      picture: embedPicture(origin, code, font, rows),
      // The SVGs render on demand: a download is a click, not a keystroke.
      fileSet: {
        snippet: embedFilesSnippet(files),
        render: () => files.map((f) => ({ name: f.name, svg: tapeToSvg(source, { cols: f.cols }).svg })),
      },
    };
  })();

  return { code, url, snippet, picture, fileSet, tooLong, pending: !code && !tooLong };
}
