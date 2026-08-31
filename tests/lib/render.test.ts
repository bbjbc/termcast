import { describe, expect, it } from 'vitest';

import { metrics, render, RENDERER_VERSION } from '@/lib/render';
import { tapeToSvg } from '@/lib/tapecast';
import { DEFAULTS, MIN_COLS, type Config, type El } from '@/lib/tape';

const cfg = (over: Partial<Config> = {}): Config => ({ ...DEFAULTS, colors: {}, ...over });
const svgOf = (tape: string) => tapeToSvg(tape).svg;

const widthOf = (svg: string) => Number(svg.match(/width="(\d+)"/)![1]);
const heightOf = (svg: string) => Number(svg.match(/height="(\d+)"/)![1]);

describe('metrics', () => {
  it('derives every measurement from the font size', () => {
    const m = metrics(cfg({ font: 20 }));
    expect(m.fs).toBe(20);
    expect(m.cw).toBeCloseTo(12, 10);
    expect(m.wide).toBeCloseTo(20, 10);
    expect(m.lh).toBe(31);
  });

  it('gives the title bar no height when there is no chrome', () => {
    expect(metrics(cfg({ chrome: 'none' })).bar).toBe(0);
    expect(metrics(cfg({ chrome: 'plain' })).bar).toBeGreaterThan(0);
  });
});

describe('render: the frame', () => {
  it('produces a standalone svg element', () => {
    const svg = svgOf('out hi\n');
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('never emits a script, which GitHub would block anyway', () => {
    expect(svgOf('out <script>alert(1)</script>\n')).not.toContain('<script');
  });

  it('escapes the characters that would break the markup', () => {
    const svg = svgOf('out a & b < c > d\n');
    expect(svg).toContain('a &amp; b &lt; c &gt; d');
  });

  it('escapes the title too', () => {
    expect(svgOf('title <b>&</b>\n')).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
  });
});

describe('render: width', () => {
  it('grows to the widest line when the width is automatic', () => {
    const narrow = widthOf(svgOf('chrome none\n\nout ' + 'x'.repeat(30) + '\n'));
    const wide = widthOf(svgOf('chrome none\n\nout ' + 'x'.repeat(60) + '\n'));
    expect(wide).toBeGreaterThan(narrow);
  });

  it('never goes under the floor, however short the tape', () => {
    const tiny = widthOf(svgOf('chrome none\n\nout hi\n'));
    const floor = widthOf(svgOf('chrome none\ncols 20\n\nout hi\n'));
    expect(tiny).toBe(floor);
  });

  it('takes an explicit width over the content', () => {
    const a = widthOf(svgOf('chrome none\ncols 40\n\nout hi\n'));
    const b = widthOf(svgOf('chrome none\ncols 80\n\nout hi\n'));
    expect(b).toBeGreaterThan(a);
  });

  it('counts the prompt when measuring the widest line', () => {
    const bare = widthOf(svgOf('chrome none\nprompt \n\ntype ' + 'x'.repeat(40) + '\n'));
    const withPrompt = widthOf(svgOf('chrome none\nprompt >>>>\n\ntype ' + 'x'.repeat(40) + '\n'));
    expect(withPrompt).toBeGreaterThan(bare);
  });
});

describe('render: height', () => {
  it('grows with the number of rows', () => {
    const one = heightOf(svgOf('chrome none\n\nout a\n'));
    const three = heightOf(svgOf('chrome none\n\nout a\nout b\nout c\n'));
    expect(three).toBeGreaterThan(one);
  });

  it('treats rows as a floor rather than a ceiling', () => {
    const asked = heightOf(svgOf('chrome none\nrows 10\n\nout a\n'));
    const over = heightOf(svgOf('chrome none\nrows 1\n\n' + 'out a\n'.repeat(12)));
    expect(asked).toBeGreaterThan(heightOf(svgOf('chrome none\n\nout a\n')));
    expect(over).toBeGreaterThan(asked);
  });
});

describe('render: chrome', () => {
  it('draws three buttons for mac', () => {
    expect(svgOf('chrome mac\n\nout a\n').match(/<circle /g)).toHaveLength(3);
  });

  it('draws none for plain, but keeps the bar', () => {
    const svg = svgOf('chrome plain\n\nout a\n');
    expect(svg).not.toContain('<circle');
    expect(svg).toContain('var(--bar)');
  });

  it('draws no bar at all for none', () => {
    expect(svgOf('chrome none\n\nout a\n')).not.toContain('var(--bar)');
  });

  it('leaves the title out when there is none', () => {
    expect(svgOf('chrome mac\n\nout a\n')).not.toContain('var(--ti)');
  });
});

describe('render: the title clears the mac buttons', () => {
  const titleX = (svg: string) => Number(svg.match(/<text x="([\d.]+)"[^>]*var\(--ti\)/)![1]);
  const lastDotX = (svg: string) => {
    const xs = [...svg.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
    return Math.max(...xs);
  };

  it('centres the title when the window is wide enough', () => {
    const svg = svgOf('chrome mac\ntitle mytool\ncols 60\n\nout a\n');
    expect(titleX(svg)).toBeCloseTo(widthOf(svg) / 2, 0);
  });

  it('pushes it clear of the buttons when it would sit under them', () => {
    const svg = svgOf('chrome mac\ntitle mytool\ncols 20\nfont 18\n\nout a\n');
    expect(titleX(svg)).toBeGreaterThan(lastDotX(svg));
  });

  it('trims a title that cannot fit', () => {
    const svg = svgOf('chrome mac\ntitle mytool --help --verbose\ncols 20\nfont 18\n\nout a\n');
    expect(svg).toContain('…');
  });

  // The parser floors cols at MIN_COLS, so a window this narrow cannot come from
  // a tape. render still guards it, because it takes a Config from any caller.
  it('drops the title entirely when there is no room even for an ellipsis', () => {
    const els: El[] = [{ kind: 'out', text: 'a', row: 0, t0: 0, tone: 'out' }];
    const svg = render(cfg({ chrome: 'mac', title: 'mytool', cols: 1 }), els, 1, 1000);
    expect(svg).not.toContain('var(--ti)');
  });

  it('centres it on the whole bar when there are no buttons', () => {
    const svg = svgOf('chrome plain\ntitle mytool\ncols 60\n\nout a\n');
    expect(titleX(svg)).toBeCloseTo(widthOf(svg) / 2, 0);
  });
});

describe('render: theme and colors', () => {
  it('emits one palette for a fixed theme', () => {
    const svg = svgOf('theme dark\n\nout a\n');
    expect(svg).not.toContain('prefers-color-scheme');
  });

  it('emits both palettes for auto', () => {
    expect(svgOf('theme auto\n\nout a\n')).toContain('prefers-color-scheme:dark');
  });

  it('lets a tape override one color', () => {
    expect(svgOf('color fg #ff00ff\n\nout a\n')).toContain('--fg:#ff00ff');
  });
});

describe('render: animation', () => {
  it('loops for ever when loop is on', () => {
    expect(svgOf('loop on\n\ntype a\n')).toContain('infinite');
  });

  it('runs once and holds when loop is off', () => {
    const svg = svgOf('loop off\n\ntype a\n');
    // The cursor blink is infinite either way, so look at the element animations
    const named = [...svg.matchAll(/animation:(?!blink)([^;}]*)/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    for (const a of named) expect(a).toContain('1 both');
  });

  it('blinks the cursor for ever regardless of loop', () => {
    expect(svgOf('loop off\n\ntype a\n')).toContain('animation:blink 1.06s step-end infinite');
  });

  it('gives every typed character its own keyframe', () => {
    const svg = svgOf('chrome none\nprompt \n\ntype abc\n');
    for (const n of [0, 1, 2]) expect(svg).toContain(`@keyframes t0_${n}`);
  });

  it('does not draw a space, which has nothing to show', () => {
    const svg = svgOf('chrome none\nprompt \n\ntype a b\n');
    expect(svg).toContain('@keyframes t0_0');
    expect(svg).not.toContain('@keyframes t0_1');   // the space
    expect(svg).toContain('@keyframes t0_2');
  });

  it('gives the prompt its own keyframe, since it is there before the typing', () => {
    expect(svgOf('prompt >\n\ntype a\n')).toContain('@keyframes p0');
  });

  it('skips a blank output line but still leaves its row', () => {
    const svg = svgOf('chrome none\n\nout a\nout\nout b\n');
    expect(svg).toContain('@keyframes o0');
    expect(svg).not.toContain('@keyframes o1');
    expect(svg).toContain('@keyframes o2');
  });

  it('keeps the last cursor to the end, and retires the earlier ones', () => {
    const svg = svgOf('prompt >\n\ntype a\ntype b\n');
    expect(svg).toContain('@keyframes c0');
    expect(svg).toContain('@keyframes c1');
  });

  it('holds every percentage inside the timeline', () => {
    const svg = svgOf('hold 0\nspeed 10ms\n\ntype ' + 'x'.repeat(80) + '\n');
    for (const [, pct] of svg.matchAll(/([\d.]+)%\{/g)) {
      expect(Number(pct)).toBeGreaterThanOrEqual(0);
      expect(Number(pct)).toBeLessThanOrEqual(100);
    }
  });
});

describe('render: tones', () => {
  it.each([
    ['ok', 'ok'],
    ['err', 'err'],
    ['warn', 'warn'],
    ['dim', 'dim'],
  ])('paints %s with its own class', (cmd, cls) => {
    expect(svgOf(`${cmd} hello\n`)).toMatch(new RegExp(`class="${cls} o\\d`));
  });

  it('paints plain output with the foreground', () => {
    expect(svgOf('out hello\n')).toMatch(/class="fg o\d/);
  });
});

describe('render: runs', () => {
  it('groups characters of equal width into one text node', () => {
    const svg = svgOf('chrome none\n\nout abc\n');
    expect(svg.match(/<text class="fg o0"/g)).toHaveLength(1);
  });

  it('splits where the width changes, so the grid holds', () => {
    const svg = svgOf('chrome none\n\nout ab한글cd\n');
    expect(svg.match(/<text class="fg o0"/g)).toHaveLength(3);
  });
});

describe('render is called with what build produced', () => {
  it('accepts an element list directly', () => {
    const els: El[] = [{ kind: 'out', text: 'hi', row: 0, t0: 0, tone: 'out' }];
    expect(render(cfg({ chrome: 'none' }), els, 1, 1000)).toContain('hi');
  });
});

describe('RENDERER_VERSION', () => {
  it('is a whole number that can go into a path', () => {
    expect(Number.isInteger(RENDERER_VERSION)).toBe(true);
    expect(RENDERER_VERSION).toBeGreaterThan(0);
  });
});

describe('tapeToSvg', () => {
  it('hands back the parse errors alongside the svg', () => {
    const { errors, svg } = tapeToSvg('out a\n???\n');
    expect(errors).toHaveLength(1);
    expect(svg).toContain('<svg');
  });

  it('reports the config it actually used', () => {
    expect(tapeToSvg('cols 40\n').cfg.cols).toBe(40);
  });
});

describe('render: a fluid window', () => {
  const fluid = (tape: string, cols: number) => tapeToSvg(tape, { cols }).svg;

  it('lets the window take the box it is given', () => {
    const svg = fluid('out hi\n', 40);
    expect(svg).toContain('width="100%"');
    expect(svg).not.toContain('viewBox');
    expect(svg).toContain('.pane{width:100%}');
  });

  it('leaves the fixed window exactly as it was', () => {
    expect(svgOf('out hi\n')).toContain('viewBox="0 0');
    expect(svgOf('out hi\n')).not.toContain('width="100%"');
  });

  it('grows taller as the width it is wrapped to narrows', () => {
    const tape = 'out the quick brown fox jumps over the lazy dog\n';
    expect(heightOf(fluid(tape, 24))).toBeGreaterThan(heightOf(fluid(tape, 80)));
  });

  it('keeps the authored font size at every width', () => {
    const size = (svg: string) => svg.match(/font-size="(\d+)"/)![1];
    expect(size(fluid('out hi\n', 24))).toBe(size(fluid('out hi\n', 80)));
  });

  it('holds a width under the floor at the floor', () => {
    const tape = 'out the quick brown fox jumps over the lazy dog\n';
    expect(fluid(tape, 4)).toBe(fluid(tape, MIN_COLS));
  });

  it('draws the bar as a rect cut to the pane, since it cannot name its width', () => {
    const svg = fluid('out hi\n', 40);
    expect(svg).toContain('clip-path="url(#pane)"');
    expect(svg).not.toContain('<path');
  });

  it('closes the border over the bar', () => {
    expect(fluid('out hi\n', 40)).toMatch(/class="edge"[^>]*stroke="var\(--bd\)"\/>\n<\/svg>$/);
  });

  it('leaves out the chrome when the tape asks for none', () => {
    const svg = fluid('chrome none\n\nout hi\n', 40);
    expect(svg).not.toContain('clip-path');
    expect(svg).toContain('width="100%"');
  });

  it('centres a title that has room, so it stays centred as the bar widens', () => {
    expect(fluid('title hi\n\nout x\n', 60)).toContain('<text x="50%"');
  });

  // Two or more widths reflow instead: those live in tests/lib/flow.test.ts.

  it('keeps the offset of a title that had to clear the dots', () => {
    const svg = fluid('title a very long window title indeed\n\nout x\n', 20);
    expect(svg).toMatch(/<text x="\d/);
    expect(svg).not.toContain('<text x="50%"');
  });
});
