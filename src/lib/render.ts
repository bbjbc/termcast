import {
  advanceOf, ellipsize, textWidth,
  LATIN_EM, WIDE_EM, type Advance,
} from './metrics';
import { MIN_COLS, type Config, type El, type Palette, THEMES } from './tape';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Bumped whenever the same tape starts rendering differently.
 *
 * `/t/<code>.svg` is addressed by the tape alone and served immutable for a year,
 * but the output depends on this file too. Without a version in the address a
 * renderer fix could never reach a URL somebody had already pasted into a README:
 * the CDN would go on serving the bytes it cached. The version changes the address,
 * so a new render gets a new one and what is already published stays as it was.
 *
 * The route accepts any version and always renders with the current code. That is
 * the point: nothing here has to keep old renderers alive, because an address that
 * was published is already frozen in the cache.
 */
export const RENDERER_VERSION = 3;

// Re-exported because the renderer is where callers expect to find them.
export { cells, cellWidth } from './metrics';

export function metrics(cfg: Config) {
  const fs = cfg.font;
  return {
    fs,
    cw: fs * LATIN_EM,
    wide: fs * WIDE_EM,
    lh: Math.round(fs * 1.57),
    padx: Math.round(fs * 1.6),
    pady: Math.round(fs * 1.3),
    bar: cfg.chrome === 'none' ? 0 : Math.round(fs * 2.6),
  };
}

/**
 * Group runs of equal-width characters. An exact width per run keeps the grid.
 *
 * The run carries the advance it was opened with. Recovering it by dividing the
 * accumulated width by the character count looks equivalent and is not: the width
 * is a running sum of an em fraction, so it drifts, and a long run of one width
 * would split partway through for no reason anybody could see.
 */
export function runs(s: string, adv: Advance): { text: string; x: number; w: number; a: number }[] {
  const out: { text: string; x: number; w: number; a: number }[] = [];
  let x = 0;
  for (const ch of s) {
    const a = adv(ch);
    const last = out[out.length - 1];
    if (last && last.a === a) {
      last.text += ch;
      last.w += a;
    } else {
      out.push({ text: ch, x, w: a, a });
    }
    x += a;
  }
  return out;
}
/** One layout: its text, its cursor, and the keyframes that drive both. */
function layer(cfg: Config, els: El[], rows: number, total: number) {
  const { fs, cw, wide, lh, padx, pady, bar } = metrics(cfg);
  const adv = advanceOf(cw, wide);
  const pct = (t: number) => Math.max(0.0001, Math.min(100, (t / total) * 100)).toFixed(4);
  const dur = (total / 1000).toFixed(2);
  const iter = cfg.loop ? 'infinite' : '1 both';

  const promptGap = (prompt: string) => (prompt ? textWidth(prompt, adv) + cw : 0);

  // Widest line in px, then expressed in columns so `cols` keeps its meaning.
  // A short tape can measure narrower than a window can usefully be, so the
  // automatic width takes the same floor an explicit `cols` does.
  const widest = els.reduce((w, e) => Math.max(
    w,
    (e.kind === 'type' ? promptGap(e.prompt) : 0) + textWidth(e.text, adv),
  ), 0);
  const cols = cfg.cols || Math.max(MIN_COLS, Math.ceil(widest / cw) + 2);

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

  /** One run at an exact offset and width, so columns line up in any font. */
  const piece = (cls: string, x: number, y: number, s: string, w: number) =>
    `<text class="${cls}" x="${(padx + x).toFixed(1)}" y="${y}" xml:space="preserve"`
    + ` textLength="${w.toFixed(1)}" lengthAdjust="spacing">${esc(s)}</text>`;

  const lastType = els.reduce((acc, e, i) => (e.kind === 'type' ? i : acc), -1);

  els.forEach((e, i) => {
    const y = top + e.row * lh + Math.round(fs * 1.07);

    if (e.kind === 'out') {
      if (!e.text.length) return;                       // blank lines only take space
      appear(`o${i}`, e.t0);
      const cls = `${e.tone === 'out' ? 'fg' : e.tone} o${i}`;
      for (const r of runs(e.text, adv)) nodes.push(piece(cls, r.x, y, r.text, r.w));
      return;
    }

    const off = promptGap(e.prompt);
    if (e.prompt) {                                     // the prompt is already there; only the command types in
      appear(`p${i}`, e.t0);
      nodes.push(piece(`dim p${i}`, 0, y, e.prompt, textWidth(e.prompt, adv)));
    }

    // Characters appear one by one at cumulative offsets, so mixed widths stay aligned.
    const chars = [...e.text];
    const stops: number[] = [0];
    chars.forEach((ch, j) => {
      const w = adv(ch);
      if (ch !== ' ') {
        appear(`t${i}_${j}`, e.t0 + j * e.speed);
        nodes.push(piece(`fg t${i}_${j}`, off + stops[j], y, ch, w));
      }
      stops.push(stops[j] + w);
    });

    // Cursor: mark every landing spot, since steps() drifts once widths are mixed.
    // Anything but the last typed line has an element after it, by definition of
    // lastType, so the next start time is always there to read.
    const tEnd = i === lastType ? total : els[i + 1].t0;
    const end = stops[chars.length].toFixed(1);
    const stay = tEnd >= total;
    names.push(`c${i}`);
    kf.push(
      `@keyframes c${i}{`
      + `0%{opacity:0;transform:translateX(0);animation-timing-function:step-end}`
      + stops.map((s, j) =>
          `${pct(e.t0 + j * e.speed)}%{opacity:1;transform:translateX(${s.toFixed(1)}px);animation-timing-function:step-end}`
        ).join('')
      + (stay ? '' : `${pct(tEnd)}%{opacity:0;transform:translateX(${end}px)}`)
      + `100%{opacity:${stay ? 1 : 0};transform:translateX(${end}px)}}`
    );
    nodes.push(`<g class="c${i}"><rect class="cur blink" x="${(padx + off).toFixed(1)}"`
      + ` y="${top + e.row * lh + Math.round(fs * 0.1)}" width="${cw.toFixed(1)}"`
      + ` height="${Math.round(fs * 1.3)}" rx="1"/></g>`);
  });

  return {
    W,
    H,
    nodes: nodes.join('\n'),
    css: `${names.map(n => `.${n}{animation:${n} ${dur}s ${iter}}`).join('')}\n${kf.join('\n')}`,
  };
}

/**
 * The window around a layout, shared with the reflowing embed in `flow.ts`.
 *
 * `W` is the floor width. Fixed output is drawn to it exactly; fluid output
 * treats it as a floor and stretches past it, which is why the title is
 * trimmed against it rather than against whatever box turns up.
 */
export function frame(cfg: Config, W: number, H: number, fluid: boolean, css: string, body: string): string {
  const { fs, padx, bar } = metrics(cfg);

  const pal = (base: Palette) => Object.entries({ ...base, ...cfg.colors })
    .map(([k, v]) => `--${k}:${v}`).join(';');
  const vars = cfg.theme === 'auto'
    ? `svg{${pal(THEMES.light)}}@media (prefers-color-scheme:dark){svg{${pal(THEMES.dark)}}}`
    : `svg{${pal(THEMES[cfg.theme])}}`;

  const dotR = fs * 0.36;
  const dotX = (i: number) => Math.round(fs * 1.45) + i * Math.round(fs * 1.2);
  const dotsEnd = cfg.chrome === 'mac' ? dotX(2) + dotR : 0;

  /**
   * Centred on the bar, the way a window title sits. The dots and the window
   * edge come first though: on a narrow window a centred title would run under
   * the mac buttons and out the far side, so it is trimmed to the space that is
   * actually free and pushed clear of the dots only when it has to be.
   */
  const titleNode = () => {
    if (!cfg.title) return '';
    const tf = fs * 0.82;
    const tadv = advanceOf(tf * LATIN_EM, tf * WIDE_EM);
    const left = (dotsEnd || padx) + Math.round(tf * 0.8);
    const right = W - padx;
    const text = ellipsize(cfg.title, right - left, tadv);
    if (!text) return '';
    const half = textWidth(text, tadv) / 2;
    const cx = Math.min(Math.max(W / 2, left + half), right - half);
    // Centred stays centred as the bar widens, but a title that had to be pushed
    // clear of the dots at the floor width keeps the offset it was given.
    const x = fluid && cx === W / 2 ? '50%' : cx.toFixed(1);
    return `<text x="${x}" y="${bar / 2 + fs * 0.3}" text-anchor="middle"`
      + ` fill="var(--ti)" font-size="${tf.toFixed(1)}">${esc(text)}</text>`;
  };

  const chrome = cfg.chrome === 'none' ? '' : [
    // The fixed bar is a path because it has to round only its top corners at a
    // known width. A fluid one cannot name its width, so it is a plain rect cut
    // to the pane's rounded outline instead.
    fluid
      ? `<rect class="pane" height="${bar}" fill="var(--bar)" clip-path="url(#pane)"/>`
      : `<path d="M.5 ${cfg.radius + .5}A${cfg.radius} ${cfg.radius} 0 0 1 ${cfg.radius + .5}.5h${W - cfg.radius * 2 - 1}a${cfg.radius} ${cfg.radius} 0 0 1 ${cfg.radius} ${cfg.radius}V${bar}H.5Z" fill="var(--bar)"/>`,
    `<line x1="0" y1="${bar}" x2="${fluid ? '100%' : W}" y2="${bar}" stroke="var(--bd)"/>`,
    cfg.chrome === 'mac'
      ? [0, 1, 2].map(i => `<circle cx="${dotX(i)}" cy="${bar / 2}" r="${dotR.toFixed(1)}" fill="var(--dot)"/>`).join('')
      : '',
    titleNode(),
  ].join('');

  const size = fluid
    ? `width="100%" height="${H}"`
    : `width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"`;
  // Widths that have to reach the render box live in CSS: a presentation
  // attribute takes no percentage here and no calc anywhere.
  const geo = fluid ? '.pane{width:100%}.edge{width:calc(100% - 1px)}\n' : '';
  // `deep` marks what spans the window's full height, so the reflowing embed
  // can pull the window up to its content per width. The bar shares `pane` for
  // its width but keeps its own height, which is why the class is separate.
  const defs = fluid
    ? `<defs><clipPath id="pane"><rect class="pane deep" height="${H}" rx="${cfg.radius}"/></clipPath></defs>\n`
    : '';
  const pane = fluid
    ? `<rect class="pane deep" height="${H}" rx="${cfg.radius}" fill="var(--bg)"/>`
    : `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${cfg.radius}" fill="var(--bg)" stroke="var(--bd)"/>`;
  // Fixed hides its top border under the bar path, which is inset half a pixel to
  // sit inside the stroke. A fluid bar is full bleed and cannot be, so the border
  // is drawn last and closes over it instead.
  const edge = fluid
    ? `\n<rect class="edge" x=".5" y=".5" height="${H - 1}" rx="${cfg.radius}" fill="none" stroke="var(--bd)"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" ${size} font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace" font-size="${fs}">
<style>
${vars}
.fg{fill:var(--fg)}.dim{fill:var(--dim)}.cur{fill:var(--fg)}
.ok{fill:var(--ok)}.err{fill:var(--err)}.warn{fill:var(--warn)}
.blink{animation:blink 1.06s step-end infinite}
@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
${geo}${css}
</style>
${defs}${pane}
${chrome}
${body}${edge}
</svg>`;
}

/**
 * `fluid` drops the viewBox and lets the window widen to whatever box the page
 * gives it.
 *
 * A viewBox scales the whole drawing; without one a user unit is a CSS pixel, so
 * the text stays the size it was authored at and only the chrome stretches. What
 * it does not do is reflow: the wrap is baked in by `build`, so `W` becomes a
 * floor and anything past the render box is cut off rather than shrunk.
 *
 * @see docs/notes/measurements.md, "SVG in an `<img>`"
 */
export function render(cfg: Config, els: El[], rows: number, total: number, fluid = false): string {
  const l = layer(cfg, els, rows, total);
  return frame(cfg, l.W, l.H, fluid, l.css, l.nodes);
}
