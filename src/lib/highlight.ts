/**
 * Split one tape line into tokens.
 * A textarea cannot color individual characters, so an overlay layer paints these
 * tokens in the same place. Pure, so it stays independent of any renderer.
 */
export type TokenKind = 'content' | 'config' | 'value' | 'comment' | 'plain';

export type Token = { text: string; kind: TokenKind };

/** Commands that build the timeline: the body of the tape, so the brightest. */
const CONTENT = new Set(['type', 'out', 'dim', 'ok', 'err', 'warn', 'wait']);

/** Commands that configure the window. These recede. */
const CONFIG = new Set([
  'title', 'prompt', 'speed', 'hold', 'theme',
  'font', 'cols', 'rows', 'chrome', 'loop', 'radius', 'color',
]);

export function highlightLine(line: string): Token[] {
  if (!line) return [];
  if (line.trimStart().startsWith('#')) return [{ text: line, kind: 'comment' }];

  const m = line.match(/^([a-z]+)(\s*)([\s\S]*)$/);
  if (!m) return [{ text: line, kind: 'plain' }];

  const [, word, gap, rest] = m;
  const kind: TokenKind = CONTENT.has(word)
    ? 'content'
    : CONFIG.has(word)
      ? 'config'
      : 'plain';

  const tokens: Token[] = [{ text: word, kind }];
  if (gap) tokens.push({ text: gap, kind: 'plain' });
  if (rest) tokens.push({ text: rest, kind: kind === 'plain' ? 'plain' : 'value' });
  return tokens;
}

export const highlightTape = (source: string): Token[][] =>
  source.split('\n').map(highlightLine);
