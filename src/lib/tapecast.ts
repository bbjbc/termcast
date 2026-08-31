import { parse, build, floorCols, type Config, type TapeError } from './tape';
import { render } from './render';
import { renderFlow } from './flow';

export type Result = { svg: string; rows: number; total: number; cfg: Config; errors: TapeError[] };

/**
 * `cols` overrides the tape's own width and asks for a fluid SVG with it. Give
 * two or more and they become the range of one reflowing image: the text is
 * laid down once and CSS wraps it to the box, from the narrowest column asked
 * for up to the widest. Anything between the two ends is accepted and ignored,
 * which keeps every address written for the layout-per-width era rendering.
 *
 * Width and fluidity travel together on purpose. A fluid window is only safe at
 * or above the width its text was wrapped to, so the caller that picks a width
 * is the caller that gets to say the window may stretch.
 */
export type Options = { cols?: number | number[] };

/** Tape source to SVG. The browser preview and the server route call the same function. */
export function tapeToSvg(src: string, opts: Options = {}): Result {
  const { cfg: parsed, cmds, errors } = parse(src);
  const asked = opts.cols === undefined ? [] : [opts.cols].flat();

  if (!asked.length) {
    const { els, rows, total } = build(parsed, cmds);
    return { svg: render(parsed, els, rows, total), rows, total, cfg: parsed, errors };
  }

  const widths = [...new Set(asked.map(floorCols))].sort((a, b) => a - b);
  if (widths.length === 1) {
    const cfg = { ...parsed, cols: widths[0] };
    const { els, rows, total } = build(cfg, cmds);
    return { svg: render(cfg, els, rows, total, true), rows, total, cfg, errors };
  }

  // The strips must arrive unwrapped: reflow wraps at display time, so building
  // with no column limit leaves each logical line whole.
  const [lo] = widths;
  const hi = widths[widths.length - 1];
  const cfg = { ...parsed, cols: lo };
  const { els, total } = build({ ...parsed, cols: 0 }, cmds);
  const { svg, rows } = renderFlow(cfg, els, total, lo, hi);
  return { svg, rows, total, cfg, errors };
}

export * from './tape';
export { RENDERER_VERSION } from './render';
