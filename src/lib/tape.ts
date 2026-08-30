// Tape grammar: parsing and configuration.
export type Theme = 'dark' | 'light' | 'auto';
export type Chrome = 'mac' | 'plain' | 'none';

export type Palette = {
  bg: string; bar: string; bd: string; dot: string; ti: string;
  fg: string; dim: string; ok: string; err: string; warn: string;
};

// The window stays monochrome; only status output carries color, because in a
// terminal that color is information rather than decoration.
export const THEMES: Record<'dark' | 'light', Palette> = {
  dark: {
    bg: '#0d0d0d', bar: '#141414', bd: '#262626', dot: '#303030', ti: '#5c5c5c',
    fg: '#e5e5e5', dim: '#737373', ok: '#3fb950', err: '#f85149', warn: '#d29922',
  },
  light: {
    bg: '#ffffff', bar: '#fafafa', bd: '#e6e6e6', dot: '#d9d9d9', ti: '#a3a3a3',
    fg: '#171717', dim: '#9ca3af', ok: '#1a7f37', err: '#cf222e', warn: '#9a6700',
  },
};

/** Output commands mapped to text color. */
export const TONES = ['out', 'dim', 'ok', 'err', 'warn'] as const;
export type Tone = (typeof TONES)[number];

export type Config = {
  title: string;
  prompt: string;
  speed: number;   // ms per character
  hold: number;    // ms to rest after the last line
  theme: Theme;
  font: number;    // px
  cols: number;    // width in columns, 0 = fit to content
  rows: number;    // minimum height in lines, 0 = fit to content
  chrome: Chrome;
  loop: boolean;
  radius: number;
  colors: Partial<Palette>;
};

export const DEFAULTS: Config = {
  title: '', prompt: '$', speed: 55, hold: 1500, theme: 'dark',
  font: 14, cols: 0, rows: 0, chrome: 'mac', loop: true, radius: 9, colors: {},
};

export type Cmd =
  | { cmd: 'type'; text: string }
  | { cmd: Tone; text: string }
  | { cmd: 'wait'; value: number }
  | { cmd: 'speed'; value: number }
  | { cmd: 'prompt'; text: string };

export type TapeError = { line: number; message: string };

const COLOR_KEYS = ['bg', 'bar', 'bd', 'dot', 'ti', 'fg', 'dim', 'ok', 'err', 'warn'] as const;
export const COLORS = COLOR_KEYS;

/** "400" | "400ms" | "1.5s" -> ms */
export function parseMs(value: string): number {
  const m = value.trim().match(/^([\d.]+)\s*(ms|s)?$/);
  if (!m) throw new Error(`invalid duration "${value}" — use 400ms or 1.5s`);
  return Math.round(parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1));
}

function parseNum(value: string, label: string, min: number, max: number): number {
  const n = Number(value.trim());
  if (!Number.isFinite(n)) throw new Error(`${label} expects a number, got "${value}"`);
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseColor(value: string, label: string): string {
  const s = value.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) {
    throw new Error(`${label} expects #rgb or #rrggbb, got "${value}"`);
  }
  return s;
}

function oneOf<T extends string>(value: string, label: string, allowed: readonly T[]): T {
  const s = value.trim() as T;
  if (!allowed.includes(s)) throw new Error(`${label} must be ${allowed.join(' | ')}, got "${value}"`);
  return s;
}

export function parse(src: string): { cfg: Config; cmds: Cmd[]; errors: TapeError[] } {
  const cfg: Config = { ...DEFAULTS, colors: {} };
  const cmds: Cmd[] = [];
  const errors: TapeError[] = [];
  const seen = new Set<string>();

  src.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) return;

    const m = line.match(/^([a-z]+)(?:\s+([\s\S]*))?$/);
    if (!m) { errors.push({ line: i + 1, message: `cannot parse "${line}"` }); return; }

    const key = m[1];
    let arg = m[2] ?? '';
    // Quote an argument to keep its leading spaces: out "    nested.txt"
    const quoted = arg.match(/^"([\s\S]*)"$/);
    if (quoted) arg = quoted[1];

    try {
      switch (key) {
        case 'title':  cfg.title = arg; break;
        case 'theme':  cfg.theme = oneOf(arg, 'theme', ['dark', 'light', 'auto'] as const); break;
        case 'chrome': cfg.chrome = oneOf(arg, 'chrome', ['mac', 'plain', 'none'] as const); break;
        case 'loop':   cfg.loop = oneOf(arg, 'loop', ['on', 'off'] as const) === 'on'; break;
        case 'hold':   cfg.hold = parseMs(arg); break;
        case 'font':   cfg.font = parseNum(arg, 'font', 8, 32); break;
        case 'cols':   cfg.cols = parseNum(arg, 'cols', 0, 200); break;
        case 'rows':   cfg.rows = parseNum(arg, 'rows', 0, 80); break;
        case 'radius': cfg.radius = parseNum(arg, 'radius', 0, 24); break;

        // speed and prompt may change mid-tape, so they are timeline commands too
        case 'speed': {
          const value = parseMs(arg);
          if (!seen.has('speed')) cfg.speed = value;
          cmds.push({ cmd: 'speed', value });
          seen.add('speed');
          break;
        }
        case 'prompt': {
          if (!seen.has('prompt')) cfg.prompt = arg;
          cmds.push({ cmd: 'prompt', text: arg });
          seen.add('prompt');
          break;
        }

        case 'type':
          cmds.push({ cmd: 'type', text: arg }); break;
        case 'out': case 'dim': case 'ok': case 'err': case 'warn':
          cmds.push({ cmd: key, text: arg }); break;
        case 'wait':
          cmds.push({ cmd: 'wait', value: parseMs(arg) }); break;

        // Colors live under `color` because `dim` is already an output command
        case 'color': {
          const [name, value = ''] = arg.trim().split(/\s+/);
          if (!(COLOR_KEYS as readonly string[]).includes(name)) {
            throw new Error(`color expects one of ${COLOR_KEYS.join(' | ')}, got "${name}"`);
          }
          cfg.colors[name as keyof Palette] = parseColor(value, `color ${name}`);
          break;
        }

        default:
          errors.push({ line: i + 1, message: `unknown command "${key}"` });
      }
    } catch (e) {
      errors.push({ line: i + 1, message: (e as Error).message });
    }
  });

  return { cfg, cmds, errors };
}

export type El =
  | { kind: 'type'; text: string; prompt: string; row: number; t0: number; speed: number }
  | { kind: 'out'; text: string; row: number; t0: number; tone: Tone };

export function build(cfg: Config, cmds: Cmd[]): { els: El[]; rows: number; total: number } {
  const els: El[] = [];
  let t = 0;
  let row = 0;
  let speed = cfg.speed;
  let prompt = cfg.prompt;

  for (const c of cmds) {
    switch (c.cmd) {
      case 'wait':   t += c.value; break;
      case 'speed':  speed = c.value; break;
      case 'prompt': prompt = c.text; break;
      case 'type':
        els.push({ kind: 'type', text: c.text, prompt, row, t0: t, speed });
        t += c.text.length * speed;
        row += 1;
        break;
      case 'out': case 'dim': case 'ok': case 'err': case 'warn':
        els.push({ kind: 'out', text: c.text, row, t0: t, tone: c.cmd });
        t += 60;
        row += 1;
        break;
    }
  }

  return { els, rows: Math.max(row, 1), total: Math.max(t + cfg.hold, 500) };
}

/**
 * Update or insert a directive so the settings panel can keep the tape text as
 * the single source of truth. Passing null removes the line, restoring the default.
 */
export function setDirective(src: string, key: string, value: string | null): string {
  const lines = src.split(/\r?\n/);
  const index = lines.findIndex(
    (line) => new RegExp(`^${key}(\\s|$)`).test(line.trim()) && !line.trimStart().startsWith('#'),
  );

  if (value === null) {
    if (index === -1) return src;
    lines.splice(index, 1);
    return lines.join('\n');
  }

  const next = `${key}${' '.repeat(Math.max(1, 8 - key.length))}${value}`;
  if (index !== -1) {
    lines[index] = next;
    return lines.join('\n');
  }

  // Append to the existing directive block, or start one at the top
  const DIRECTIVE = /^(title|prompt|speed|hold|theme|font|cols|rows|chrome|loop|radius|color)(\s|$)/;
  let last = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    if (DIRECTIVE.test(line)) last = i;
    else break;
  }
  lines.splice(last + 1, 0, next);
  return lines.join('\n');
}
