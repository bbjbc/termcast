import { parse, build, type Config, type TapeError } from './tape';
import { render } from './render';

export type Result = { svg: string; rows: number; total: number; cfg: Config; errors: TapeError[] };

/** Tape source to SVG. The browser preview and the server route call the same function. */
export function tapeToSvg(src: string): Result {
  const { cfg, cmds, errors } = parse(src);
  const { els, rows, total } = build(cfg, cmds);
  return { svg: render(cfg, els, rows, total), rows, total, cfg, errors };
}

export * from './tape';
export { RENDERER_VERSION } from './render';
