import { describe, expect, it } from 'vitest';

import { highlightLine, highlightTape } from '@/lib/highlight';

describe('highlightLine', () => {
  it('gives an empty line no tokens', () => {
    expect(highlightLine('')).toEqual([]);
  });

  it('marks a comment whole, indented or not', () => {
    expect(highlightLine('# a note')).toEqual([{ text: '# a note', kind: 'comment' }]);
    expect(highlightLine('   # a note')).toEqual([{ text: '   # a note', kind: 'comment' }]);
  });

  it('marks a line it cannot read as plain', () => {
    expect(highlightLine('!!!')).toEqual([{ text: '!!!', kind: 'plain' }]);
  });

  it('marks a timeline command as content and its argument as a value', () => {
    expect(highlightLine('type  npm i')).toEqual([
      { text: 'type', kind: 'content' },
      { text: '  ', kind: 'plain' },
      { text: 'npm i', kind: 'value' },
    ]);
  });

  it('marks a window directive as config', () => {
    expect(highlightLine('title mytool')).toEqual([
      { text: 'title', kind: 'config' },
      { text: ' ', kind: 'plain' },
      { text: 'mytool', kind: 'value' },
    ]);
  });

  it('leaves the argument of an unknown word plain rather than a value', () => {
    expect(highlightLine('nope hello')).toEqual([
      { text: 'nope', kind: 'plain' },
      { text: ' ', kind: 'plain' },
      { text: 'hello', kind: 'plain' },
    ]);
  });

  it('emits the word alone when nothing follows it', () => {
    expect(highlightLine('out')).toEqual([{ text: 'out', kind: 'content' }]);
  });

  it('emits no gap token when there is no gap', () => {
    expect(highlightLine('color#fff')).toEqual([
      { text: 'color', kind: 'config' },
      { text: '#fff', kind: 'value' },
    ]);
  });
});

describe('highlightTape', () => {
  it('returns one token list per line, blank lines included', () => {
    expect(highlightTape('out a\n\n# c')).toEqual([
      [{ text: 'out', kind: 'content' }, { text: ' ', kind: 'plain' }, { text: 'a', kind: 'value' }],
      [],
      [{ text: '# c', kind: 'comment' }],
    ]);
  });
});
