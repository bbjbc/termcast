import { describe, expect, it } from 'vitest';

import { tapeToSvg } from '@/lib/tapecast';

// A reflowing embed: two or more widths become the range of one image.
const flowOf = (tape: string, cols: number[] = [24, 94]) => tapeToSvg(tape, { cols }).svg;
const heightOf = (svg: string) => Number(svg.match(/height="(\d+)"/)![1]);

const LONG = `chrome none\n\nout ${'ab'.repeat(60)}\nout tail\n`;

describe('flow: one strip instead of one layout per width', () => {
  it('computes the wrap width from the box, clamped to the range', () => {
    const svg = flowOf(LONG);
    expect(svg).toContain('--w:clamp(201.6px,round(down,calc(100vw - 44px + 0.02px),8.4px),789.6px)');
    expect(svg).toContain('.win{width:var(--w)}');
  });

  it('keeps the whole mechanism behind @supports, for engines without round()', () => {
    const svg = flowOf(LONG);
    expect(svg).toContain('@supports (width:round(down,10px,3px))');
    // Outside it, everything is pinned to the narrow end of the range.
    expect(svg).toContain('.win{width:201.6px}');
    expect(svg).toContain('.x1{transform:translate(-201.6px,22px)}');
  });

  it('lays a wrapping line down once and clips row copies out of it', () => {
    const svg = flowOf(LONG);
    // 120 characters at 24 columns is five rows: five copies of one strip.
    expect(svg.match(/<g class="x\d+">/g)).toHaveLength(6);   // 5 + 1 for "tail"
    expect(svg).toContain('clip-path="url(#win)"');
  });

  it('emits one keyframe set for the whole file', () => {
    const svg = flowOf(LONG);
    expect(svg.match(/@keyframes o0\{/g)).toHaveLength(1);
    expect(svg).not.toContain('@keyframes L0_');
  });

  it('places breakpoints only where a row count changes', () => {
    // ceil(120 / c) moves at 30, 40 and 60 columns; each shifts "tail".
    const svg = flowOf(LONG);
    expect(svg).toContain('@media (min-width:295.98px) and (max-width:379.98px)');
    expect(svg.match(/\.ln1\{transform:translateY\(\d+px\)\}/g)!.length).toBeGreaterThan(2);
  });

  it('needs no breakpoints when nothing above a line ever wraps', () => {
    const svg = flowOf('chrome none\n\nout hi\nout there\n');
    expect(svg).not.toContain('@media (min-width');
  });

  it('takes the tallest wrap as the height, since an img cannot resize itself', () => {
    const narrow = heightOf(tapeToSvg(LONG, { cols: 24 }).svg);
    expect(heightOf(flowOf(LONG))).toBe(narrow);
  });

  it('reports the rows of the narrow end, same as the layout it replaces', () => {
    expect(tapeToSvg(LONG, { cols: [24, 94] }).rows).toBe(tapeToSvg(LONG, { cols: 24 }).rows);
  });

  it('keeps the authored font size in the markup it emits', () => {
    expect(flowOf(LONG)).toContain('font-size="14"');
    expect(flowOf(LONG)).toContain('width="100%"');
    expect(flowOf(LONG)).not.toContain('viewBox');
  });

  it('holds the rows floor the tape asked for', () => {
    const bare = heightOf(flowOf('chrome none\n\nout a\n'));
    const held = heightOf(flowOf('chrome none\nrows 10\n\nout a\n'));
    expect(held).toBeGreaterThan(bare);
  });

  it('renders an empty tape as an empty window', () => {
    const svg = flowOf('');
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<text');
  });
});

describe('flow: printed glyphs are pinned to their own cells', () => {
  it('writes an x per glyph, so a clip edge cannot catch a drifted one', () => {
    // 'a' sits at the padding, 'b' two cells later; the space takes no node.
    expect(flowOf('chrome none\n\nout a b\n')).toContain('x="22.0 38.8" y="15">ab</text>');
  });

  it('skips a blank line but keeps its row', () => {
    const svg = flowOf('chrome none\n\nout a\nout\nout b\n');
    expect(svg).not.toContain('@keyframes o1');
    expect(svg).toContain('.ln2{transform:translateY(44px)}');
  });

  it('keeps each tone on its own class', () => {
    const svg = flowOf('chrome none\n\ndim quiet\nok fine\n');
    expect(svg).toMatch(/class="dim o0"/);
    expect(svg).toMatch(/class="ok o1"/);
  });
});

describe('flow: the typed line and its cursor', () => {
  const TYPED = 'prompt >\n\ntype first\ntype second\n';

  it('reveals characters on the shared timeline, one keyframe each', () => {
    const svg = flowOf('prompt >\n\ntype ab cd\n');
    expect(svg).toContain('@keyframes t0_0');
    expect(svg).not.toContain('@keyframes t0_2');   // the space
    expect(svg).toContain('@keyframes t0_3');
    expect(svg).toContain('@keyframes p0');
  });

  it('types without a prompt when the tape says so', () => {
    const svg = flowOf('chrome none\nprompt \n\ntype abc\n');
    expect(svg).not.toContain('@keyframes p0');
    expect(svg).toContain('@keyframes t0_0');
  });

  it('keeps the last cursor to the end, and retires the earlier ones', () => {
    const svg = flowOf(TYPED);
    expect(svg).toMatch(/@keyframes c0\{.*100%\{opacity:0/);
    expect(svg).toMatch(/@keyframes c1\{.*100%\{opacity:1/);
  });

  it('loops or holds with the tape, while the blink stays infinite', () => {
    expect(flowOf('loop on\n\ntype a\n')).toContain('infinite}');
    const held = flowOf('loop off\n\ntype a\n');
    expect(held).toMatch(/\.c0\{animation:c0 [\d.]+s 1 both\}/);
    expect(held).toContain('animation:blink 1.06s step-end infinite');
  });
});

describe('flow: lines a cell grid cannot slide', () => {
  // Two-cell glyphs do not break at multiples of the wrap width, so these
  // lines take explicit per-interval shifts instead of the shared -j*w one.
  const KO = `chrome none\n\nout ${'한글'.repeat(20)}\n`;

  it('gives every glyph its own node, addressable on its own', () => {
    expect(flowOf(KO)).toMatch(/class="fg o0 g0"/);
  });

  it('hides the glyph the wrap cuts in the row it does not belong to', () => {
    expect(flowOf(KO)).toMatch(/\.ln0 \.x\d+ \.g\d+\{visibility:hidden\}/);
  });

  it('shows it again at a width where the cut moves elsewhere', () => {
    expect(flowOf(KO)).toMatch(/\.ln0 \.x\d+ \.g\d+\{visibility:visible\}/);
  });

  it('shifts its rows by explicit offsets per interval', () => {
    expect(flowOf(KO)).toMatch(/@media [^{]+\{[^}]*\.ln0 \.x1\{transform:translate\(-\d/);
  });

  it('parks a copy the current width does not need past the strip', () => {
    // At the wide end the line takes fewer rows than at the narrow end; the
    // spare copy is pinned, so it has to be moved off rather than left showing
    // the tail again. Parked offset = strip length plus one cell.
    const svg = flowOf(KO);
    const px = 20 * 2 * 14;                        // forty wide glyphs
    expect(svg).toContain(`translate(${(-(px + 8.4)).toFixed(1)}px`);
  });

  it('treats a typed wide line the same way, through the character classes', () => {
    const svg = flowOf(`prompt >\n\ntype ${'한글'.repeat(20)}\n`);
    expect(svg).toMatch(/\.ln0 \.x\d+ \.t0_\d+\{visibility:hidden\}/);
  });

  it('treats a prompt too wide for the floor as a shifted line, not a broken one', () => {
    const svg = flowOf(`chrome none\nprompt ${'x'.repeat(30)}\n\ntype abc\n`, [20, 94]);
    expect(svg).toContain('.ln0 .x1{transform:translate(');
  });
});

describe('flow: how the range is read', () => {
  it('treats a repeated width as the one fluid layout it is', () => {
    expect(tapeToSvg('out hi\n', { cols: [40, 40] }).svg)
      .toBe(tapeToSvg('out hi\n', { cols: 40 }).svg);
  });

  it('reads the range whichever way round it arrives', () => {
    expect(tapeToSvg(LONG, { cols: [94, 24] }).svg).toBe(tapeToSvg(LONG, { cols: [24, 94] }).svg);
  });

  it('ignores the middle of a width list, which older addresses still carry', () => {
    expect(tapeToSvg(LONG, { cols: [24, 40, 60, 94] }).svg)
      .toBe(tapeToSvg(LONG, { cols: [24, 94] }).svg);
  });
});
