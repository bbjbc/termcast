import { LATIN_EM } from './metrics';
import { RENDERER_VERSION } from './render';
import { MAX_COLS, MIN_COLS } from './tape';

/**
 * The boxes a README embed is wrapped for, narrowest first.
 *
 * Each layout is wrapped to the narrowest column it will be shown in and takes
 * over at exactly that width, so nothing is ever cut off; wider than that it
 * leaves space at the right. The first sits just below the narrowest column a
 * README has, and the rest divide what is left evenly, which spreads the wasted
 * width instead of piling it into one stretch.
 *
 * Three is a judgement, not a limit. Another costs a copy of the text in the
 * same file and no extra line in anybody's README.
 *
 * @see docs/notes/measurements.md for the column widths these come from
 * @see docs/notes/decisions.md for why the layouts travel in one file
 */
const LAYOUTS = [248, 443, 641];

/**
 * Columns that fit a box, at the measurements the renderer will use.
 *
 * These have to agree with `metrics`, so they are derived from the font the same
 * way rather than copied: padding is 1.6em a side and a Latin advance is 0.6em.
 */
export const colsIn = (px: number, font: number) => Math.min(
  MAX_COLS,
  Math.max(MIN_COLS, Math.floor((px - Math.round(font * 1.6) * 2) / (font * LATIN_EM))),
);

/** The one line to paste into a README. */
export function embedSnippet(origin: string, code: string, font: number): string {
  const widths = LAYOUTS.map((px) => colsIn(px, font)).join('-');
  return `<img src="${origin}/t/v${RENDERER_VERSION}/w${widths}/${code}.svg" width="100%" alt="demo">`;
}
