import { describe, expect, it } from 'vitest';

import {
  build, floorCols, parse, parseMs, setDirective,
  COLORS, DEFAULTS, MIN_COLS, THEMES, TONES,
} from '@/lib/tape';

const cfgOf = (src: string) => parse(src).cfg;
const errsOf = (src: string) => parse(src).errors;

describe('parseMs', () => {
  it.each([
    ['400', 400],
    ['400ms', 400],
    ['1.5s', 1500],
    ['  250 ms  ', 250],
    ['0', 0],
  ])('reads %s', (input, ms) => {
    expect(parseMs(input)).toBe(ms);
  });

  it('rounds to whole milliseconds', () => {
    expect(parseMs('1.2345s')).toBe(1235);
  });

  it('refuses anything it cannot read', () => {
    expect(() => parseMs('soon')).toThrow(/invalid duration/);
    expect(() => parseMs('5m')).toThrow(/invalid duration/);
  });
});

describe('floorCols', () => {
  it('keeps zero, which means fit to the content', () => {
    expect(floorCols(0)).toBe(0);
  });

  it('raises anything below the floor', () => {
    expect(floorCols(1)).toBe(MIN_COLS);
    expect(floorCols(MIN_COLS - 1)).toBe(MIN_COLS);
  });

  it('leaves a real width alone', () => {
    expect(floorCols(MIN_COLS)).toBe(MIN_COLS);
    expect(floorCols(80)).toBe(80);
  });
});

describe('parse: blank and comment lines', () => {
  it('produces nothing from an empty tape', () => {
    const { cmds, errors } = parse('');
    expect(cmds).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('ignores blank lines and comments, indented or not', () => {
    const { cmds, errors } = parse('\n  \n# a note\n   # indented note\n');
    expect(cmds).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('reads CRLF the same as LF', () => {
    expect(parse('out a\r\nout b\r\n').cmds).toEqual([
      { cmd: 'out', text: 'a' },
      { cmd: 'out', text: 'b' },
    ]);
  });

  it('drops trailing whitespace but keeps the argument', () => {
    expect(parse('out  hello   ').cmds).toEqual([{ cmd: 'out', text: 'hello' }]);
  });
});

describe('parse: directives', () => {
  it('starts from the defaults', () => {
    expect(cfgOf('')).toEqual({ ...DEFAULTS, colors: {} });
  });

  it('reads the string directives', () => {
    const cfg = cfgOf('title  mytool\nprompt >\n');
    expect(cfg.title).toBe('mytool');
    expect(cfg.prompt).toBe('>');
  });

  it('takes a directive with no argument as empty', () => {
    expect(cfgOf('title').title).toBe('');
  });

  it.each([
    ['theme', 'light'],
    ['chrome', 'plain'],
  ])('reads %s', (key, value) => {
    expect(cfgOf(`${key} ${value}`)[key as 'theme' | 'chrome']).toBe(value);
  });

  it('turns loop on and off', () => {
    expect(cfgOf('loop on').loop).toBe(true);
    expect(cfgOf('loop off').loop).toBe(false);
  });

  it('rejects a value outside the allowed set', () => {
    expect(errsOf('theme purple')).toEqual([
      { line: 1, message: 'theme must be dark | light | auto, got "purple"' },
    ]);
  });

  it('reads the numeric directives', () => {
    const cfg = cfgOf('font 20\nrows 10\nradius 4\ncols 40\n');
    expect(cfg).toMatchObject({ font: 20, rows: 10, radius: 4, cols: 40 });
  });

  it('clamps a number to its range', () => {
    expect(cfgOf('font 999').font).toBe(32);
    expect(cfgOf('font 1').font).toBe(8);
    expect(cfgOf('rows 999').rows).toBe(80);
  });

  it('rounds a fractional number', () => {
    expect(cfgOf('font 14.6').font).toBe(15);
  });

  it('rejects a number it cannot read', () => {
    expect(errsOf('font big')).toEqual([
      { line: 1, message: 'font expects a number, got "big"' },
    ]);
  });

  it('holds cols at the floor', () => {
    expect(cfgOf('cols 5').cols).toBe(MIN_COLS);
    expect(cfgOf('cols 0').cols).toBe(0);
  });

  it('reads hold as a duration', () => {
    expect(cfgOf('hold 2s').hold).toBe(2000);
  });

  it('keeps leading spaces inside quotes', () => {
    expect(parse('out "    nested.txt"').cmds).toEqual([
      { cmd: 'out', text: '    nested.txt' },
    ]);
  });
});

describe('parse: speed and prompt are also timeline commands', () => {
  it('takes the first speed as the config and every one as a command', () => {
    const { cfg, cmds } = parse('speed 10ms\ntype a\nspeed 90ms\ntype b\n');
    expect(cfg.speed).toBe(10);
    expect(cmds.filter((c) => c.cmd === 'speed')).toEqual([
      { cmd: 'speed', value: 10 },
      { cmd: 'speed', value: 90 },
    ]);
  });

  it('does the same for prompt', () => {
    const { cfg, cmds } = parse('prompt >\ntype a\nprompt $\ntype b\n');
    expect(cfg.prompt).toBe('>');
    expect(cmds.filter((c) => c.cmd === 'prompt')).toEqual([
      { cmd: 'prompt', text: '>' },
      { cmd: 'prompt', text: '$' },
    ]);
  });
});

describe('parse: output commands', () => {
  it('keeps every tone', () => {
    const src = TONES.map((t) => `${t} line`).join('\n');
    expect(parse(src).cmds).toEqual(TONES.map((t) => ({ cmd: t, text: 'line' })));
  });

  it('reads type and wait', () => {
    expect(parse('type ls\nwait 300ms').cmds).toEqual([
      { cmd: 'type', text: 'ls' },
      { cmd: 'wait', value: 300 },
    ]);
  });
});

describe('parse: colors', () => {
  it('reads a color override', () => {
    expect(cfgOf('color fg #ff0000').colors).toEqual({ fg: '#ff0000' });
  });

  it.each(['#abc', '#aabbcc', '#AABBCCDD'])('accepts %s', (value) => {
    expect(cfgOf(`color bg ${value}`).colors.bg).toBe(value);
  });

  it('names every key it will accept', () => {
    expect(errsOf('color nope #fff')[0].message)
      .toBe(`color expects one of ${COLORS.join(' | ')}, got "nope"`);
  });

  it('rejects a value that is not a hex color', () => {
    expect(errsOf('color fg red')).toEqual([
      { line: 1, message: 'color fg expects #rgb or #rrggbb, got "red"' },
    ]);
  });

  it('rejects a color with no value at all', () => {
    expect(errsOf('color fg')[0].message).toMatch(/expects #rgb/);
  });
});

describe('parse: errors', () => {
  it('reports an unknown command with its line', () => {
    expect(errsOf('out a\nfly away\n')).toEqual([
      { line: 2, message: 'unknown command "fly"' },
    ]);
  });

  it('reports a line it cannot parse at all', () => {
    expect(errsOf('!!!')).toEqual([
      { line: 1, message: 'cannot parse "!!!"' },
    ]);
  });

  it('carries on past a bad line', () => {
    const { cmds, errors } = parse('out a\n???\nout b\n');
    expect(cmds).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });
});

describe('build', () => {
  const cfg = { ...DEFAULTS, colors: {} };

  it('gives an empty tape one row and a floor duration', () => {
    const { els, rows, total } = build(cfg, []);
    expect(els).toEqual([]);
    expect(rows).toBe(1);
    expect(total).toBe(Math.max(cfg.hold, 500));
  });

  it('never returns a duration under the floor', () => {
    expect(build({ ...cfg, hold: 0 }, []).total).toBe(500);
  });

  it('puts each command on its own row', () => {
    const { els, rows } = build(cfg, [
      { cmd: 'out', text: 'a' },
      { cmd: 'out', text: 'b' },
    ]);
    expect(els.map((e) => e.row)).toEqual([0, 1]);
    expect(rows).toBe(2);
  });

  it('advances the clock by wait', () => {
    const { els } = build(cfg, [
      { cmd: 'wait', value: 700 },
      { cmd: 'out', text: 'a' },
    ]);
    expect(els[0].t0).toBe(700);
  });

  it('charges typing by the character', () => {
    const { els, total } = build({ ...cfg, hold: 0, speed: 200 }, [
      { cmd: 'type', text: 'abcd' },
    ]);
    expect(els[0]).toMatchObject({ kind: 'type', speed: 200, prompt: cfg.prompt });
    expect(total).toBe(800);
  });

  it('holds the duration at the floor when the tape is shorter than it', () => {
    expect(build({ ...cfg, hold: 0, speed: 10 }, [{ cmd: 'type', text: 'ab' }]).total)
      .toBe(500);
  });

  it('applies a speed change from that point on', () => {
    const { els } = build(cfg, [
      { cmd: 'speed', value: 10 },
      { cmd: 'type', text: 'ab' },
      { cmd: 'speed', value: 100 },
      { cmd: 'type', text: 'cd' },
    ]);
    expect(els.map((e) => e.kind === 'type' && e.speed)).toEqual([10, 100]);
    expect(els[1].t0).toBe(20);
  });

  it('applies a prompt change from that point on', () => {
    const { els } = build(cfg, [
      { cmd: 'type', text: 'a' },
      { cmd: 'prompt', text: '#' },
      { cmd: 'type', text: 'b' },
    ]);
    expect(els.map((e) => e.kind === 'type' && e.prompt)).toEqual([cfg.prompt, '#']);
  });

  it('counts a typed character by code point, not by UTF-16 unit', () => {
    const { total } = build({ ...cfg, hold: 0, speed: 100 }, [
      { cmd: 'type', text: '🚀' },
    ]);
    expect(total).toBe(500);   // one character, so the floor rather than two units
  });
});

describe('build: wrapping', () => {
  const wide = { ...DEFAULTS, colors: {}, cols: 0, font: 10, prompt: '' };

  it('leaves everything on one row when the width is automatic', () => {
    const { els } = build(wide, [{ cmd: 'out', text: 'x'.repeat(200) }]);
    expect(els).toHaveLength(1);
  });

  it('breaks a printed line at the window width', () => {
    const cfg = { ...wide, cols: 10 };
    const { els, rows } = build(cfg, [{ cmd: 'out', text: 'x'.repeat(25) }]);
    expect(els.map((e) => e.text)).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
    expect(rows).toBe(3);
  });

  it('shows every row of a printed line at once', () => {
    const { els } = build({ ...wide, cols: 10 }, [{ cmd: 'out', text: 'x'.repeat(25) }]);
    expect(new Set(els.map((e) => e.t0)).size).toBe(1);
  });

  it('carries typing through the break', () => {
    const cfg = { ...wide, cols: 10, speed: 100, hold: 0 };
    const { els, total } = build(cfg, [{ cmd: 'type', text: 'x'.repeat(15) }]);
    expect(els).toHaveLength(2);
    expect(els[0].t0).toBe(0);
    expect(els[1].t0).toBe(10 * 100);   // straight on from where the first row ended
    expect(total).toBe(15 * 100);
  });

  it('continues a wrapped command at column zero', () => {
    const cfg = { ...wide, cols: 10, prompt: '>' };
    const { els } = build(cfg, [{ cmd: 'type', text: 'x'.repeat(15) }]);
    expect(els.map((e) => e.kind === 'type' && e.prompt)).toEqual(['>', '']);
  });

  it('leaves the first row shorter by the prompt and its gap', () => {
    const cfg = { ...wide, cols: 10, prompt: '>' };
    const { els } = build(cfg, [{ cmd: 'type', text: 'x'.repeat(15) }]);
    expect(els[0].text).toHaveLength(8);   // ten columns less the prompt and one space
  });

  it('keeps a blank line as a row that takes space', () => {
    const { els, rows } = build({ ...wide, cols: 10 }, [{ cmd: 'out', text: '' }]);
    expect(els).toEqual([{ kind: 'out', text: '', row: 0, t0: 0, tone: 'out' }]);
    expect(rows).toBe(1);
  });
});

describe('setDirective', () => {
  // Splitting on newlines and rejoining leaves the trailing blank line in place,
  // so an inserted directive comes back with the newline after it.
  it('inserts into an empty tape', () => {
    expect(setDirective('', 'cols', '80')).toBe('cols    80\n');
  });

  it('pads the key out to a column', () => {
    expect(setDirective('', 'font', '14')).toBe('font    14\n');
    expect(setDirective('', 'chrome', 'mac')).toBe('chrome  mac\n');
  });

  it('leaves a single space when the key is already that wide', () => {
    expect(setDirective('', 'directive', 'x')).toBe('directive x\n');
  });

  it('replaces a directive that is already there', () => {
    expect(setDirective('title  a\ncols  40\n', 'cols', '80'))
      .toBe('title  a\ncols    80\n');
  });

  it('removes a directive when the value is null', () => {
    expect(setDirective('title  a\ncols  40\n', 'cols', null)).toBe('title  a\n');
  });

  it('does nothing when removing one that is not there', () => {
    const src = 'title  a\n';
    expect(setDirective(src, 'cols', null)).toBe(src);
  });

  it('appends to the directive block rather than the top', () => {
    expect(setDirective('title  a\nprompt >\n\ntype ls\n', 'cols', '80'))
      .toBe('title  a\nprompt >\ncols    80\n\ntype ls\n');
  });

  it('starts a block above the first command when there is none', () => {
    expect(setDirective('type ls\n', 'cols', '80')).toBe('cols    80\ntype ls\n');
  });

  it('skips blanks and comments when looking for the end of the block', () => {
    expect(setDirective('# note\n\ntitle  a\ntype ls\n', 'cols', '80'))
      .toBe('# note\n\ntitle  a\ncols    80\ntype ls\n');
  });

  it('ignores a commented-out directive when looking for one to replace', () => {
    expect(setDirective('# cols 40\ntitle  a\n', 'cols', '80'))
      .toBe('# cols 40\ntitle  a\ncols    80\n');
  });

  it('handles a color key, which carries a space', () => {
    expect(setDirective('', 'color fg', '#fff')).toBe('color fg #fff\n');
  });
});

describe('exported tables', () => {
  it('gives light and dark a value for every palette key', () => {
    for (const theme of [THEMES.light, THEMES.dark]) {
      expect(Object.keys(theme).sort()).toEqual([...COLORS].sort());
    }
  });
});
