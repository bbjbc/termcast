import { type Config, type El, type Palette, THEMES } from './tape';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Terminal cell width. CJK, kana, fullwidth forms and emoji occupy two cells.
 * Counting them as one squashes the glyphs and breaks the grid.
 */
export function cells(cp: number): 1 | 2 {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x303e)
    || (cp >= 0x3041 && cp <= 0x33ff) || (cp >= 0x3400 && cp <= 0x4dbf)
    || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xa000 && cp <= 0xa4cf)
    || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff)
    || (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff)
    || (cp >= 0x20000 && cp <= 0x3fffd)
    ? 2 : 1;
}

export const cellWidth = (s: string) =>
  [...s].reduce((w, ch) => w + cells(ch.codePointAt(0)!), 0);

/** Group runs of equal-width characters; an exact width per run keeps the grid. */
function runs(s: string): { text: string; at: number; w: number }[] {
  const out: { text: string; at: number; w: number }[] = [];
  let at = 0;
  for (const ch of s) {
    const c = cells(ch.codePointAt(0)!);
    const last = out[out.length - 1];
    if (last && last.w / [...last.text].length === c) {
      last.text += ch;
      last.w += c;
    } else {
      out.push({ text: ch, at, w: c });
    }
    at += c;
  }
  return out;
}

export function metrics(cfg: Config) {
  const fs = cfg.font;
  return {
    fs,
    cw: fs * 0.6,
    lh: Math.round(fs * 1.57),
    padx: Math.round(fs * 1.6),
    pady: Math.round(fs * 1.3),
    bar: cfg.chrome === 'none' ? 0 : Math.round(fs * 2.6),
  };
}

export function render(cfg: Config, els: El[], rows: number, total: number): string {
  const { fs, cw, lh, padx, pady, bar } = metrics(cfg);
  const pct = (t: number) => Math.max(0.0001, Math.min(100, (t / total) * 100)).toFixed(4);
  const dur = (total / 1000).toFixed(2);
  const iter = cfg.loop ? 'infinite' : '1 both';

  const auto = els.reduce((w, e) => Math.max(
    w,
    (e.kind === 'type' ? (e.prompt ? cellWidth(e.prompt) + 1 : 0) : 0) + cellWidth(e.text) + 2,
  ), 24);
  const cols = cfg.cols || auto;
  // rows is a floor, never a ceiling: a static SVG cannot scroll, so clipping
  // content to a set height would silently lose lines.
  const height = Math.max(rows, cfg.rows);
  const W = Math.round(padx * 2 + cols * cw);
  const H = Math.round(bar + pady * 2 + height * lh);
  const top = bar + pady;

  const kf: string[] = [], nodes: string[] = [], names: string[] = [];

  const appear = (name: string, t0: number) => {
    names.push(name);
    kf.push(`@keyframes ${name}{0%{opacity:0;animation-timing-function:step-end}${pct(t0)}%{opacity:1}100%{opacity:1}}`);
  };

  /** One run on the cell grid. An explicit width keeps columns aligned in any font. */
  const piece = (cls: string, at: number, y: number, s: string, w: number) =>
    `<text class="${cls}" x="${(padx + at * cw).toFixed(1)}" y="${y}" xml:space="preserve"`
    + ` textLength="${(w * cw).toFixed(1)}" lengthAdjust="spacing">${esc(s)}</text>`;

  const lastType = els.reduce((acc, e, i) => (e.kind === 'type' ? i : acc), -1);

  els.forEach((e, i) => {
    const y = top + e.row * lh + Math.round(fs * 1.07);

    if (e.kind === 'out') {
      if (!e.text.length) return;                       // blank lines only take space
      appear(`o${i}`, e.t0);
      const cls = `${e.tone === 'out' ? 'fg' : e.tone} o${i}`;
      for (const r of runs(e.text)) nodes.push(piece(cls, r.at, y, r.text, r.w));
      return;
    }

    const off = e.prompt ? cellWidth(e.prompt) + 1 : 0;
    if (e.prompt) {                                     // the prompt is already there; only the command types in
      appear(`p${i}`, e.t0);
      nodes.push(piece(`dim p${i}`, 0, y, e.prompt, cellWidth(e.prompt)));
    }

    // Characters appear one by one at cumulative offsets, so mixed widths stay aligned.
    const chars = [...e.text];
    const stops: number[] = [0];
    chars.forEach((ch, j) => {
      const w = cells(ch.codePointAt(0)!);
      if (ch !== ' ') {
        appear(`t${i}_${j}`, e.t0 + j * e.speed);
        nodes.push(piece(`fg t${i}_${j}`, off + stops[j], y, ch, w));
      }
      stops.push(stops[j] + w);
    });

    // Cursor: mark every landing spot, since steps() drifts once widths are mixed
    const tEnd = i === lastType ? total : (els[i + 1]?.t0 ?? total);
    const end = (stops[chars.length] * cw).toFixed(1);
    const stay = tEnd >= total;
    names.push(`c${i}`);
    kf.push(
      `@keyframes c${i}{`
      + `0%{opacity:0;transform:translateX(0);animation-timing-function:step-end}`
      + stops.map((s, j) =>
          `${pct(e.t0 + j * e.speed)}%{opacity:1;transform:translateX(${(s * cw).toFixed(1)}px);animation-timing-function:step-end}`
        ).join('')
      + (stay ? '' : `${pct(tEnd)}%{opacity:0;transform:translateX(${end}px)}`)
      + `100%{opacity:${stay ? 1 : 0};transform:translateX(${end}px)}}`
    );
    nodes.push(`<g class="c${i}"><rect class="cur blink" x="${(padx + off * cw).toFixed(1)}"`
      + ` y="${top + e.row * lh + Math.round(fs * 0.1)}" width="${cw.toFixed(1)}"`
      + ` height="${Math.round(fs * 1.3)}" rx="1"/></g>`);
  });

  const pal = (base: Palette) => Object.entries({ ...base, ...cfg.colors })
    .map(([k, v]) => `--${k}:${v}`).join(';');
  const vars = cfg.theme === 'auto'
    ? `svg{${pal(THEMES.light)}}@media (prefers-color-scheme:dark){svg{${pal(THEMES.dark)}}}`
    : `svg{${pal(THEMES[cfg.theme])}}`;

  const chrome = cfg.chrome === 'none' ? '' : [
    `<path d="M.5 ${cfg.radius + .5}A${cfg.radius} ${cfg.radius} 0 0 1 ${cfg.radius + .5}.5h${W - cfg.radius * 2 - 1}a${cfg.radius} ${cfg.radius} 0 0 1 ${cfg.radius} ${cfg.radius}V${bar}H.5Z" fill="var(--bar)"/>`,
    `<line x1="0" y1="${bar}" x2="${W}" y2="${bar}" stroke="var(--bd)"/>`,
    cfg.chrome === 'mac'
      ? [0, 1, 2].map(i => `<circle cx="${Math.round(fs * 1.45) + i * Math.round(fs * 1.2)}" cy="${bar / 2}" r="${(fs * 0.36).toFixed(1)}" fill="var(--dot)"/>`).join('')
      : '',
    cfg.title
      ? `<text x="${W / 2}" y="${bar / 2 + fs * 0.3}" text-anchor="middle" fill="var(--ti)" font-size="${(fs * 0.82).toFixed(1)}">${esc(cfg.title)}</text>`
      : '',
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace" font-size="${fs}">
<style>
${vars}
.fg{fill:var(--fg)}.dim{fill:var(--dim)}.cur{fill:var(--fg)}
.ok{fill:var(--ok)}.err{fill:var(--err)}.warn{fill:var(--warn)}
.blink{animation:blink 1.06s step-end infinite}
@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
${names.map(n => `.${n}{animation:${n} ${dur}s ${iter}}`).join('')}
${kf.join('\n')}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${cfg.radius}" fill="var(--bg)" stroke="var(--bd)"/>
${chrome}
${nodes.join('\n')}
</svg>`;
}
