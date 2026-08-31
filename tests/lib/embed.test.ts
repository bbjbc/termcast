import { describe, expect, it } from 'vitest';

import { colsIn, embedRange, embedSnippet } from '@/lib/embed';
import { MAX_COLS, MIN_COLS } from '@/lib/tape';
import { RENDERER_VERSION } from '@/lib/tapecast';

describe('colsIn', () => {
  it('counts the columns a box holds at the renderer’s own measurements', () => {
    // 340px, 22px of padding a side, an 8.4px advance: 35 columns and a remainder.
    expect(colsIn(340, 14)).toBe(35);
  });

  it('holds a box too small to be a terminal at the floor', () => {
    expect(colsIn(80, 14)).toBe(MIN_COLS);
  });

  it('holds a box wider than a tape may ask for at the ceiling', () => {
    expect(colsIn(100000, 14)).toBe(MAX_COLS);
  });

  it('gives a bigger font fewer columns in the same box', () => {
    expect(colsIn(600, 20)).toBeLessThan(colsIn(600, 14));
  });
});

describe('embedSnippet', () => {
  const snippet = embedSnippet('https://x.dev', 'CODE', 14);

  it('is one line, because the one image reflows itself', () => {
    expect(snippet.split('\n')).toHaveLength(1);
    expect(snippet).not.toContain('<picture');
    expect(snippet).not.toContain('<source');
  });

  it('asks for the whole range at one address', () => {
    expect(snippet).toBe(
      `<img src="https://x.dev/t/v${RENDERER_VERSION}/w24-94/CODE.svg" width="100%" alt="demo">`,
    );
  });

  it('spans from under the narrowest README column to the widest', () => {
    const [lo, hi] = embedRange(14);
    expect(lo).toBe(colsIn(248, 14));
    expect(hi).toBe(colsIn(838, 14));
    expect(lo).toBeLessThan(hi);
  });

  it('lets the window take the column it is given', () => {
    expect(snippet).toContain('width="100%"');
  });

  it('narrows the range with the font, since a column holds fewer big glyphs', () => {
    const [lo, hi] = embedRange(20);
    const [lo14, hi14] = embedRange(14);
    expect(lo).toBeLessThanOrEqual(lo14);
    expect(hi).toBeLessThan(hi14);
  });
});
