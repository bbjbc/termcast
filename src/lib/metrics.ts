// How wide a character is. Shared because both the tape (which decides where a
// line wraps) and the renderer (which places the glyphs) have to agree, and
// neither may import the other.

/**
 * Terminal cell width. CJK, kana, fullwidth forms and emoji occupy two cells.
 * Counting them as one squashes the glyphs and breaks the grid.
 */
export function cells(cp: number): 1 | 2 {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x303e)
    || (cp >= 0x3041 && cp <= 0x33ff) || (cp >= 0x3400 && cp <= 0x4dbf)
    || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xa000 && cp <= 0xa4cf)
    || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff)
    || (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff)
    || (cp >= 0x20000 && cp <= 0x3fffd)
    ? 2 : 1;
}

export const cellWidth = (s: string) =>
  [...s].reduce((w, ch) => w + cells(ch.codePointAt(0)!), 0);

/**
 * Latin monospace advances land near 0.6em: IBM Plex Mono and DejaVu Sans Mono
 * are 0.600 and 0.602, Consolas 0.550.
 *
 * A wide glyph is two cells, but it is not 1.2em. Every CJK font measured puts
 * Hangul at 1.0em (Nanum Gothic Coding, Malgun Gothic) or a little under
 * (Noto Sans KR, 0.92). Reserving 1.2em and pinning it with textLength pushed
 * the leftover 0.2em into the gaps between glyphs, so Korean came out visibly
 * letter-spaced. Advancing wide glyphs by their real width fixes that, and the
 * grid stays deterministic because textLength still pins every run.
 *
 * @see docs/notes/measurements.md, "Font advances"
 */
export const LATIN_EM = 0.6;
export const WIDE_EM = 1.0;

export type Advance = (ch: string) => number;

/** Horizontal space one character takes, in px. */
export const advanceOf = (cw: number, wide: number): Advance =>
  (ch) => (cells(ch.codePointAt(0)!) === 2 ? wide : cw);

/** The advance a tape's own font size implies. */
export const advanceFor = (font: number): Advance =>
  advanceOf(font * LATIN_EM, font * WIDE_EM);

/** Width of a whole string, in px. */
export const textWidth = (s: string, adv: Advance) =>
  [...s].reduce((w, ch) => w + adv(ch), 0);

/**
 * Longest prefix that fits `max`, marked with an ellipsis when anything was cut.
 * U+2026 is present in every font measured, including the ones missing the
 * arrows and check marks, so it is safe to reach for.
 */
export function ellipsize(s: string, max: number, adv: Advance): string {
  if (textWidth(s, adv) <= max) return s;
  const room = max - adv('…');
  if (room < 0) return '';
  let out = '', w = 0;
  for (const ch of s) {
    const a = adv(ch);
    if (w + a > room) break;
    out += ch;
    w += a;
  }
  return `${out}…`;
}

/**
 * Break `s` into pieces that each fit their row. The first row may be shorter
 * because a prompt sits in front of it, so widths come in as a list.
 *
 * Breaking happens at the character, the way a terminal wraps: it has no idea
 * what a word is, and a demo that silently reflowed prose would not match the
 * thing it is a picture of.
 */
export function wrapText(s: string, adv: Advance, widthAt: (row: number) => number): string[] {
  const out: string[] = [];
  let line = '', w = 0, row = 0, max = widthAt(0);

  // Widths are sums of an em fraction, so a row that fills exactly can land a
  // hair over its own limit. Without the slack the last character wraps alone.
  const fits = (used: number, add: number, limit: number) => used + add <= limit + 1e-6;

  for (const ch of s) {
    const a = adv(ch);
    if (line && !fits(w, a, max)) {
      out.push(line);
      row += 1;
      max = widthAt(row);
      line = '';
      w = 0;
    }
    line += ch;
    w += a;
  }

  out.push(line);
  return out;
}
