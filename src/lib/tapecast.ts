import { parse, build, floorCols, type Config, type TapeError } from './tape';
import { render, renderLayers, type Layer } from './render';

export type Result = { svg: string; rows: number; total: number; cfg: Config; errors: TapeError[] };

/**
 * `cols` overrides the tape's own width and asks for a fluid SVG with it. Give
 * several and they become layouts inside one image, narrowest first, with CSS
 * picking the widest that fits the box.
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

  // Narrowest first, and distinct: two layouts of one width would leave the
  // second an empty range to match on.
  const widths = [...new Set(asked.map(floorCols))].sort((a, b) => a - b);
  const layers: Layer[] = widths.map((cols) => {
    const cfg = { ...parsed, cols };
    return { cfg, ...build(cfg, cmds) };
  });

  const [first] = layers;
  const svg = layers.length === 1
    ? render(first.cfg, first.els, first.rows, first.total, true)
    : renderLayers(layers);
  return { svg, rows: first.rows, total: first.total, cfg: first.cfg, errors };
}

export * from './tape';
export { RENDERER_VERSION } from './render';
