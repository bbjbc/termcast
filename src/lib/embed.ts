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

/**
 * A tape title as the embed's alt text: markup escaped, and an empty title
 * falling back to the word the embed always used.
 */
export const embedAlt = (title: string) => (title.trim() || 'demo')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
 * A band only earns its line when it changes something: `rows` says how many
 * rows the tape takes at a width, and neighbouring bands that reserve the same
 * height collapse into the narrower one. A tape whose lines never wrap
 * collapses all the way down to the one-line `<img>`. The browser downloads
 * exactly one variant, so the bands that remain cost nothing on the wire, and
 * the `<img>` fallback is also what a sanitizer that strips `<source>` leaves
 * standing.
 */
export function embedPicture(
  origin: string, code: string, font: number, rows: (cols: number) => number, title = '',
): string {
  const hi = colsIn(WIDEST, font);
  // Every floor is at most WIDEST, so a band's lo never crosses hi.
  return assemble(embedBands(font, rows).map(([viewport, lo]) => ({
    viewport,
    src: `${origin}/t/v${RENDERER_VERSION}/w${lo}-${hi}/${code}.svg`,
  })), embedAlt(title));
}

/**
 * The viewport classes this tape can actually tell apart, narrowest first,
 * each with the columns its variant reflows down to.
 *
 * Walks narrowest first, the base included. Absorbing a band into the group
 * below hands the group the narrower of the two floors, because the group's
 * one variant now has to survive both stretches; that is only free when the
 * tape takes the same rows at the narrower floor, the group's and the band's
 * own. The floors zigzag (the sidebar takes the column back down at 768), so
 * the minimum is taken rather than assumed.
 */
export function embedBands(
  font: number, rows: (cols: number) => number,
): [viewport: number, lo: number][] {
  const all: [viewport: number, floor: number][] = [[0, NARROWEST], ...[...BANDS].reverse()];
  const kept: [viewport: number, lo: number][] = [];
  for (const [viewport, floor] of all) {
    const lo = colsUnder(floor, font);
    const last = kept[kept.length - 1];
    if (last) {
      const merged = Math.min(last[1], lo);
      if (rows(merged) === rows(last[1]) && rows(merged) === rows(lo)) {
        last[1] = merged;
        continue;
      }
    }
    kept.push([viewport, lo]);
  }
  return kept;
}

/** Variants to markup: an img when one is all there is, a picture otherwise. */
function assemble(variants: { viewport: number; src: string }[], alt: string): string {
  const img = `<img src="${variants[0].src}" width="100%" alt="${alt}">`;
  if (variants.length === 1) return img;
  return [
    '<picture>',
    ...variants.slice(1).reverse().map((v) =>
      `  <source media="(min-width: ${v.viewport}px)" srcset="${v.src}">`),
    `  ${img}`,
    '</picture>',
  ].join('\n');
}
