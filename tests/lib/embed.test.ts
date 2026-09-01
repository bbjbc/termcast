import { describe, expect, it } from 'vitest';

import { colsIn, embedAlt, embedPicture } from '@/lib/embed';
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

describe('embedAlt', () => {
  it('uses the tape title, escaped for an attribute', () => {
    expect(embedAlt('my "quoted" <tool> & co')).toBe('my &quot;quoted&quot; &lt;tool&gt; &amp; co');
  });

  it('falls back to the word the embed always used', () => {
    expect(embedAlt('')).toBe('demo');
    expect(embedAlt('   ')).toBe('demo');
  });
});

describe('embedPicture', () => {
  // Rows shrink as columns grow, the way any tape's do.
  const steep = (cols: number) => Math.ceil(200 / cols);
  const picture = embedPicture('https://x.dev', 'CODE', 14, steep, 'mytool');
  const los = [...picture.matchAll(/\/w(\d+)-94\//g)].map((m) => Number(m[1]));

  it('is one variant per viewport class, widest first, with an img fallback', () => {
    const lines = picture.split('\n');
    expect(lines[0]).toBe('<picture>');
    expect(lines[lines.length - 1]).toBe('</picture>');
    expect(picture).toContain('<img src=');
    expect(picture).toContain('width="100%"');
    const vps = [...picture.matchAll(/min-width: (\d+)px/g)].map((m) => Number(m[1]));
    expect(vps.length).toBeGreaterThan(0);
    expect([...vps].sort((a, b) => b - a)).toEqual(vps);
  });

  it('names the demo what the tape titled it', () => {
    expect(picture).toContain('alt="mytool"');
    expect(embedPicture('https://x.dev', 'CODE', 14, steep)).toContain('alt="demo"');
  });

  it('keys each band on its own narrowest measured column when nothing merges', () => {
    // 200 characters change row count at every floor, so every band earns its
    // line. The floors zigzag because the sidebar arrives at 768 and takes
    // the column back down; the lo values zigzag with them.
    expect(los).toEqual([93, 56, 41, 53, 43, 28, 22]);
  });

  it('hands an absorbed stretch the narrower of the floors, so nothing clips', () => {
    // The 768 band's floor (398px) is narrower than the 600 band's (502px):
    // when they reserve the same rows the merged variant keeps the 768 floor.
    const flat41 = (cols: number) => (cols >= 41 ? 2 : Math.ceil(200 / cols));
    const merged = embedPicture('https://x.dev', 'CODE', 14, flat41);
    expect(merged).toContain('/w41-94/CODE.svg');
    expect(merged).not.toContain('/w53-94/');
    expect(merged).not.toContain('/w62-94/');
    expect(merged).not.toContain('/w93-94/');
  });

  it('collapses to a single img line when the tape never wraps', () => {
    const flat = embedPicture('https://x.dev', 'CODE', 14, () => 5);
    expect(flat).toBe(`<img src="https://x.dev/t/v${RENDERER_VERSION}/w22-94/CODE.svg" width="100%" alt="demo">`);
  });
});
