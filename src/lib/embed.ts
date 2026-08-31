import { LATIN_EM } from './metrics';
import { RENDERER_VERSION } from './render';
import { MAX_COLS, MIN_COLS } from './tape';

/**
 * The span of README column widths an embed has to cover.
 *
 * The embed reflows: the wrap width is computed by CSS from the box the page
 * gives the image, so there is no layout table to space out and no gap to buy
 * down. The address only has to say how far the reflow reaches. Below the
 * floor the text stays wrapped to the floor and the box cuts it off, the same
 * as any single layout would; above the ceiling it stops widening and leaves
 * space at the right, which at these widths is where a demo stops being worth
 * more columns.
 *
 * @see docs/notes/measurements.md for the column widths these come from
 * @see docs/notes/decisions.md for why one address carries the whole range
 */
const NARROWEST = 248;
const WIDEST = 838;

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

/** The column range an embed reflows across, narrow end first. */
export const embedRange = (font: number): [number, number] =>
  [colsIn(NARROWEST, font), colsIn(WIDEST, font)];

/** The one line to paste into a README. */
export function embedSnippet(origin: string, code: string, font: number): string {
  const [lo, hi] = embedRange(font);
  return `<img src="${origin}/t/v${RENDERER_VERSION}/w${lo}-${hi}/${code}.svg" width="100%" alt="demo">`;
}
