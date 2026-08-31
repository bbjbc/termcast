import { LATIN_EM } from './metrics';
import { RENDERER_VERSION } from './render';
import { MAX_COLS, MIN_COLS } from './tape';

/**
 * The span of README column widths an embed has to cover, and how finely.
 *
 * Each layout is wrapped to a width and takes over at exactly that width, so it
 * is never cut off; between one layout and the next it leaves space at the
 * right. That gap is the whole cost of the approach, and it is what `STEP`
 * buys down: a line should break where it meets the padding, not well before
 * it, and a few layouts spaced far apart break lines a dozen characters early.
 *
 * Two columns is close enough that the break lands within one character of the
 * edge. It costs about thirty-six copies of the text in the one file, which is
 * a few kilobytes on the wire once it is compressed, and no extra line in
 * anybody's README.
 *
 * @see docs/notes/measurements.md for the column widths these come from
 * @see docs/notes/decisions.md for why the layouts travel in one file
 */
const NARROWEST = 248;
const WIDEST = 838;
const STEP = 2;

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

/** The widths an embed is wrapped for, narrowest first. */
export function embedWidths(font: number): number[] {
  const lo = colsIn(NARROWEST, font);
  const hi = colsIn(WIDEST, font);
  const out: number[] = [];
  for (let c = lo; c < hi; c += STEP) out.push(c);
  out.push(hi);                     // the widest column always gets an exact fit
  return out;
}

/** The one line to paste into a README. */
export function embedSnippet(origin: string, code: string, font: number): string {
  const widths = embedWidths(font).join('-');
  return `<img src="${origin}/t/v${RENDERER_VERSION}/w${widths}/${code}.svg" width="100%" alt="demo">`;
}
