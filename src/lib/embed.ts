import { LATIN_EM } from './metrics';
import { RENDERER_VERSION } from './render';
import { MAX_COLS, MIN_COLS } from './tape';

/**
 * The GitHub column widths an embed has to survive, measured on github.com and
 * recorded in docs/notes/measurements.md, "The README column". Repository and
 * profile pages differ, so each figure is the narrower of the two.
 *
 * The embed reflows: the wrap width is computed by CSS from the box the page
 * gives the image, so these only bound the range. Below the floor the text
 * stays wrapped to the floor and the box cuts it off, the same as any single
 * layout would; above the ceiling it stops widening and leaves space at the
 * right, which at these widths is where a demo stops being worth more columns.
 */
const NARROWEST = 238;   // profile page at a 320px viewport; repository is 254
const WIDEST = 838;      // flat from 1280 up on both page kinds

/**
 * Viewport classes and the narrowest column measured inside each, widest
 * first. The column does not climb with the viewport: the sidebar arrives at
 * 768 and takes it back down, which is why the floors zigzag. A `<source>`
 * list is matched top down, so the order handles that on its own.
 */
const BANDS: [viewport: number, floor: number][] = [
  [1280, WIDEST],
  [1012, 578],
  [768, 398],
  [600, 502],
  [500, 418],
  [375, 293],
];

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

/**
 * One column under what a box strictly holds. The measured floors sit within a
 * pixel of a column boundary, and GitHub's layout is not a contract; a column
 * of slack means a small reshuffle costs a little blank space, never text.
 */
const colsUnder = (px: number, font: number) => Math.max(MIN_COLS, colsIn(px, font) - 1);

/** The column range an embed reflows across, narrow end first. */
export const embedRange = (font: number): [number, number] =>
  [colsUnder(NARROWEST, font), colsIn(WIDEST, font)];

/** One line that works anywhere, reserving the height of its narrowest wrap. */
export function embedSnippet(origin: string, code: string, font: number): string {
  const [lo, hi] = embedRange(font);
  return `<img src="${origin}/t/v${RENDERER_VERSION}/w${lo}-${hi}/${code}.svg" width="100%" alt="demo">`;
}

/**
 * The embed for a GitHub README: one variant per viewport class, so the height
 * reserve follows the screen instead of always paying for a phone.
 *
 * The height of an `<img>` box is settled before the SVG's own CSS runs, so it
 * has to be reserved for the narrowest wrap the address covers, and on a
 * desktop most of that reserve is blank. A `<picture>` keyed on the viewport
 * was rejected once for picking wrap widths, because a viewport is not a
 * column and the mismatch cut text off. Picking only the reserve is a
 * different matter: every variant still reflows to whatever box it lands in,
 * so a misjudged breakpoint costs a couple of blank rows, never a character.
 *
 * The browser downloads exactly one variant, so the bands cost nothing on the
 * wire; what they buy is the reserve, which shrinks to the rows the band's own
 * floor needs. The narrow variant stays the `<img>` fallback, which is also
 * what a sanitizer that strips `<source>` leaves standing.
 */
export function embedPicture(origin: string, code: string, font: number): string {
  const hi = colsIn(WIDEST, font);
  // Every floor is at most WIDEST, so a band's lo never crosses hi.
  const src = (lo: number) =>
    `${origin}/t/v${RENDERER_VERSION}/w${lo}-${hi}/${code}.svg`;
  return [
    '<picture>',
    ...BANDS.map(([viewport, floor]) =>
      `  <source media="(min-width: ${viewport}px)" srcset="${src(colsUnder(floor, font))}">`),
    `  <img src="${src(colsUnder(NARROWEST, font))}" width="100%" alt="demo">`,
    '</picture>',
  ].join('\n');
}
