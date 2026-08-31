import { advanceOf, textWidth, type Advance } from './metrics';
import { esc, frame, metrics } from './render';
import type { Config, El } from './tape';

/**
 * A responsive embed that reflows instead of carrying one layout per width.
 *
 * Each logical line is laid down once, as an unwrapped strip. A line that
 * wraps into k rows is the same strip drawn k times: copy j is shifted left by
 * j times the wrap width and down one row, and a single clip band of that
 * width cuts every copy to its window. Wrapping is therefore not baked in; the
 * wrap width is computed by CSS from the box the page actually gave the image:
 *
 *   --w: clamp(lo, round(down, 100vw - padding, cell), hi)
 *
 * `100vw` inside an SVG loaded through `<img>` is the render box, the same
 * length the media queries match against. `round(down, .., cell)` floors it to
 * whole columns, so the break always lands within one cell of the padding, at
 * every width, with no layout table to interpolate.
 *
 * What CSS cannot compute is the vertical map: a line's y is the sum of the
 * row counts of every line above it, and that changes only at the column
 * counts where some line gains or loses a row. Those are the breakpoints. Each
 * gets a media query holding a few translateY rules, not a copy of the demo,
 * so the file grows with the tape and not with the number of widths covered.
 *
 * Text where every character is one cell wide breaks at exact multiples of the
 * wrap width, which is what the shared `-j * var(--w)` shift assumes. A line
 * holding a two-cell character does not: the wide glyph that misses the row
 * end leaves a hole, the next row starts early, and both facts move with the
 * width. Such a line keeps the one-strip body but takes explicit per-interval
 * shifts, and the glyph that straddles a row end is hidden in the row it does
 * not belong to (visibility, not display: Chromium keeps animating display:none
 * elements, which is the bug class this renderer otherwise retires).
 *
 * Engines without CSS `round()` would compute no wrap width at all, so the
 * whole mechanism sits inside `@supports`. Outside it the same body is pinned
 * to the narrowest width: exactly the old single-layout behaviour, text safe
 * at every box, space at the right on wide ones.
 *
 * @see docs/notes/decisions.md, "The embed reflows by clipping one strip"
 * @see docs/notes/measurements.md, "Reflow instead of layouts"
 */

/** Matches the slack `wrapText` gives a row that fills exactly (metrics.ts). */
const EPS = 1e-6;

/**
 * CSS `round()` divides in doubles with no such slack: a 210px box over 8.4px
 * cells comes out at 24.999... and loses a column. Nudging the length by a
 * hair under a hundredth of a pixel restores the column and cannot cross a
 * real cell boundary.
 */
const NUDGE = 0.02;

type Line = {
  el: El;
  /** px before the first typed character: the prompt and one cell of gap. */
  indent: number;
  /** Strip length in px, indent included. */
  px: number;
  /** Every advance is one cell, so row j starts at exactly j*w. */
  uniform: boolean;
};

/** Row counts and break offsets of one line at one column count. */
type Wrap = { rows: number; breaks: number[] };

export function renderFlow(
  cfg: Config, els: El[], total: number, lo: number, hi: number,
): { svg: string; rows: number } {
  const { fs, cw, wide, lh, padx, pady, bar } = metrics(cfg);
  const adv = advanceOf(cw, wide);
  const W = Math.round(padx * 2 + lo * cw);

  const pct = (t: number) => Math.max(0.0001, Math.min(100, (t / total) * 100)).toFixed(4);
  const dur = (total / 1000).toFixed(2);
  const iter = cfg.loop ? 'infinite' : '1 both';
  const px1 = (n: number) => n.toFixed(1);

  const lines: Line[] = els.map((el) => {
    const indent = el.kind === 'type' && el.prompt ? textWidth(el.prompt, adv) + cw : 0;
    const chars = el.kind === 'type' ? el.prompt + el.text : el.text;
    return {
      el,
      indent,
      px: indent + textWidth(el.text, adv),
      // The indent must also leave room for at least one cell, or row 0 cannot
      // hold what wrapText would give it and the uniform arithmetic is off.
      uniform: [...chars].every((ch) => adv(ch) === cw) && indent + cw <= lo * cw + EPS,
    };
  });

  /** Where a line breaks at width w, as strip offsets. Mirrors `wrapText`. */
  const wrapAt = (line: Line, w: number): Wrap => {
    if (line.uniform) {
      const rows = Math.max(1, Math.ceil((line.px - EPS) / w));
      return { rows, breaks: Array.from({ length: rows }, (_, j) => j * w) };
    }
    const breaks = [0];
    let x = line.indent;
    let n = 0;                                    // characters on the current row
    for (const ch of line.el.text) {
      const a = adv(ch);
      if (n > 0 && x + a > breaks[breaks.length - 1] + w + EPS) {
        breaks.push(x);
        n = 0;
      }
      x += a;
      n += 1;
    }
    return { rows: breaks.length, breaks };
  };

  const wrapsAt = (c: number) => lines.map((l) => wrapAt(l, c * cw));
  const atLo = wrapsAt(lo);
  const maxRows = atLo.map((w) => w.rows);
  const maxk = Math.max(1, ...maxRows);
  const rowsLo = maxRows.reduce((a, b) => a + b, 0);

  // ------------------------------------------------------------------ body
  // Every piece is built once. Copies of a line reuse the same nodes and
  // differ only in the transform of the group around them, so what a copy may
  // ever show bounds which pieces it needs to carry at all.
  type Piece = { node: string; x0: number; x1: number };

  const kf: string[] = [];
  const names: string[] = [];
  const y = Math.round(fs * 1.07);
  const piece = (cls: string, x: number, x1: number, s: string, w: number): Piece => ({
    node: `<text class="${cls}" x="${px1(padx + x)}" y="${y}" xml:space="preserve"`
      + ` textLength="${px1(w)}" lengthAdjust="spacing">${esc(s)}</text>`,
    x0: x,
    x1,
  });

  const appear = (name: string, t0: number) => {
    names.push(name);
    kf.push(`@keyframes ${name}{0%{opacity:0;animation-timing-function:step-end}${pct(t0)}%{opacity:1}100%{opacity:1}}`);
  };

  const lastType = els.reduce((acc, e, i) => (e.kind === 'type' ? i : acc), -1);

  // A printed line's glyphs are pinned one by one: an x per glyph in a single
  // <text>. A run pinned with textLength lets glyphs sit up to a fraction of a
  // pixel off the cell grid, which no fixed layout could see and a clip edge
  // can: the glyph next to a row boundary bleeds a hair into the other row.
  // An absolute x puts every glyph on its own cell exactly.
  type Glyph = { ch: string; x: number };
  const glyphs: Glyph[][] = lines.map(() => []);

  const pieces: Piece[][] = lines.map((line, i) => {
    const el = line.el;
    const out: Piece[] = [];

    if (el.kind === 'out') {
      if (!el.text.length) return out;            // blank lines only take space
      appear(`o${i}`, el.t0);
      const cls = `${el.tone === 'out' ? 'fg' : el.tone} o${i}`;
      let x = 0;
      [...el.text].forEach((ch, m) => {
        const a = adv(ch);
        if (ch !== ' ') {
          if (line.uniform) glyphs[i].push({ ch, x });
          // One node per character instead, so the glyph that straddles a row
          // end can be hidden on its own in the row it does not belong to.
          else out.push(piece(`${cls} g${m}`, x, x + a, ch, a));
        }
        x += a;
      });
      return out;
    }

    if (el.prompt) {                               // the prompt is already there; only the command types in
      appear(`p${i}`, el.t0);
      out.push(piece(`dim p${i}`, 0, line.indent, el.prompt, textWidth(el.prompt, adv)));
    }

    // Characters appear one by one at cumulative offsets, so mixed widths stay
    // aligned, and each is its own node either way; `t${i}_${m}` doubles as the
    // handle a straddled glyph is hidden by.
    const chars = [...el.text];
    const stops: number[] = [0];
    chars.forEach((ch, m) => {
      const a = adv(ch);
      const x = line.indent + stops[m];
      if (ch !== ' ') {
        appear(`t${i}_${m}`, el.t0 + m * el.speed);
        out.push(piece(`fg t${i}_${m}`, x, x + a, ch, a));
      }
      stops.push(stops[m] + a);
    });

    // Cursor: mark every landing spot, since steps() drifts once widths are
    // mixed. It walks the whole strip and surfaces in whichever row copy's
    // window holds its column, so the wrap needs no cursor logic at all.
    const tEnd = i === lastType ? total : els[i + 1].t0;
    const end = stops[chars.length];
    const stay = tEnd >= total;
    names.push(`c${i}`);
    kf.push(
      `@keyframes c${i}{`
      + `0%{opacity:0;transform:translateX(0);animation-timing-function:step-end}`
      + stops.map((s, m) =>
          `${pct(el.t0 + m * el.speed)}%{opacity:1;transform:translateX(${px1(s)}px);animation-timing-function:step-end}`
        ).join('')
      + (stay ? '' : `${pct(tEnd)}%{opacity:0;transform:translateX(${px1(end)}px)}`)
      + `100%{opacity:${stay ? 1 : 0};transform:translateX(${px1(end)}px)}}`
    );
    out.push({
      node: `<g class="c${i}"><rect class="cur blink" x="${px1(padx + line.indent)}"`
        + ` y="${Math.round(fs * 0.1)}" width="${px1(cw)}" height="${Math.round(fs * 1.3)}" rx="1"/></g>`,
      x0: line.indent,
      x1: line.indent + end + cw,
    });
    return out;
  });

  const body = lines.map((line, i) => {
    if (!pieces[i].length && !glyphs[i].length) return '';
    const cls = line.el.kind === 'out' && line.el.tone !== 'out' ? `${line.el.tone} o${i}` : `fg o${i}`;
    const copies = Array.from({ length: maxRows[i] }, (_, j) => {
      // Copy j can only ever show this window of the strip, however the
      // breakpoints fall, so anything outside it need not be carried.
      const b0 = j === 0 ? 0 : j * lo * cw - EPS;
      const b1 = (j + 1) * hi * cw + EPS;
      const kept = pieces[i].filter((p) => p.x1 > b0 && p.x0 < b1).map((p) => p.node);
      const g = glyphs[i].filter((p) => p.x + cw > b0 && p.x < b1);
      if (g.length) {
        kept.push(`<text class="${cls}" x="${g.map((p) => px1(padx + p.x)).join(' ')}" y="${y}">`
          + `${esc(g.map((p) => p.ch).join(''))}</text>`);
      }
      return `<g class="x${j}">${kept.join('')}</g>`;
    }).join('');
    return `<g class="ln${i}">${copies}</g>`;
  }).filter(Boolean).join('\n');

  // The image box is sized once, for the tallest wrap; an <img> cannot grow as
  // its column narrows, so the spare height has to exist. What can follow the
  // width is the drawn window: each breakpoint knows its row count, so the
  // window is pulled up to its content and the spare height stays transparent
  // page rather than empty terminal.
  const hAt = (rows: number) => Math.round(bar + pady * 2 + Math.max(rows, cfg.rows) * lh);
  const H = hAt(rowsLo);

  // ------------------------------------------------------------------- css
  // The default rules pin everything to the narrowest width; that is the whole
  // story for an engine without round(), which drops the @supports block and
  // behaves like the old single-layout embed. Inside it, the width goes live
  // and the breakpoints override what changed.
  const yAt = (wraps: Wrap[]) => {
    const ys: number[] = [];
    let row = 0;
    wraps.forEach((w, i) => {
      ys[i] = row * lh;
      row += w.rows;
    });
    return ys;
  };
  const yLo = yAt(atLo);

  // The straddle selector needs the piece's own class, which differs by kind.
  const hideSel = (i: number, j: number, m: number) =>
    `.ln${i} .x${j} .${lines[i].el.kind === 'type' ? `t${i}_${m}` : `g${m}`}`;

  /** Char index starting at strip offset `at`. */
  const charAt = (line: Line, at: number): number => {
    let x = line.indent;
    let m = 0;
    for (const ch of line.el.text) {
      // The offsets come from the same running sum, so this is an exact match.
      if (x >= at - EPS) break;
      x += adv(ch);
      m += 1;
    }
    return m;
  };

  /** The glyphs cut mid-cell at one column count, as "line/copy/char" keys. */
  const straddleSet = (wraps: Wrap[], c: number) => {
    const hit = new Set<string>();
    lines.forEach((line, i) => {
      if (line.uniform) return;
      const b = wraps[i].breaks;
      for (let j = 0; j + 1 < b.length; j += 1) {
        if (b[j + 1] - b[j] < c * cw - EPS) hit.add(`${i}/${j}/${charAt(line, b[j + 1])}`);
      }
    });
    return hit;
  };

  // Breakpoints: the column counts where any rule this file writes actually
  // changes. A uniform line only contributes its row count, because its break
  // offsets ride on --w and need no rules; a stepped line contributes the
  // offsets themselves.
  const signature = (wraps: Wrap[]) => wraps.map((w, i) =>
    lines[i].uniform ? String(w.rows) : w.breaks.map(px1).join(','),
  ).join(';');
  const steps: { c: number; wraps: Wrap[] }[] = [];
  for (let c = lo; c <= hi; c += 1) {
    const wraps = wrapsAt(c);
    if (!steps.length || signature(wraps) !== signature(steps[steps.length - 1].wraps)) {
      steps.push({ c, wraps });
    }
  }

  const fallback: string[] = [];
  fallback.push(`.win{width:${px1(lo * cw)}px}`);
  for (let j = 1; j < maxk; j += 1) {
    fallback.push(`.x${j}{transform:translate(${px1(-j * lo * cw)}px,${j * lh}px)}`);
  }
  lines.forEach((line, i) => {
    if ((pieces[i].length || glyphs[i].length) && yLo[i]) fallback.push(`.ln${i}{transform:translateY(${yLo[i]}px)}`);
    if (!line.uniform) {
      atLo[i].breaks.forEach((b, j) => {
        if (j) fallback.push(`.ln${i} .x${j}{transform:translate(${px1(-b)}px,${j * lh}px)}`);
      });
    }
  });
  const hidLo = straddleSet(atLo, lo);
  for (const key of hidLo) {
    const [i, j, m] = key.split('/').map(Number);
    fallback.push(`${hideSel(i, j, m)}{visibility:hidden}`);
  }

  // Each interval holds only what differs from the narrow-end defaults. Its
  // upper bound is exactly the next interval's lower bound: a box right on the
  // boundary matches both queries and the later block wins the cascade, so
  // there is no width a box could fall between and nothing has to be restated
  // from one block to the next.
  const bound = (c: number) => (padx * 2 + c * cw - NUDGE).toFixed(2);
  const blocks = steps.map(({ c, wraps }, k) => {
    const rules: string[] = [];
    const ys = yAt(wraps);
    lines.forEach((line, i) => {
      if (!pieces[i].length && !glyphs[i].length) return;
      if (ys[i] !== yLo[i]) rules.push(`.ln${i}{transform:translateY(${ys[i]}px)}`);
      if (!line.uniform) {
        // A uniform line's spare copies go blank on their own: their window
        // slides past the end of the strip as the width grows. A stepped
        // copy is pinned to an explicit offset, so a copy this interval does
        // not need has to be parked past the strip's end by hand, or it
        // would show the tail a second time.
        for (let j = 1; j < maxRows[i]; j += 1) {
          // The narrow end always uses every copy, so the default is never a
          // parked one and can be read off the break list directly.
          const b = j < wraps[i].breaks.length ? wraps[i].breaks[j] : line.px + cw;
          if (b !== atLo[i].breaks[j]) {
            rules.push(`.ln${i} .x${j}{transform:translate(${px1(-b)}px,${j * lh}px)}`);
          }
        }
      }
    });
    const hid = straddleSet(wraps, c);
    for (const key of new Set([...hid, ...hidLo])) {
      if (hid.has(key) === hidLo.has(key)) continue;
      const [i, j, m] = key.split('/').map(Number);
      rules.push(`${hideSel(i, j, m)}{visibility:${hid.has(key) ? 'hidden' : 'visible'}}`);
    }
    const hC = hAt(wraps.reduce((n, w2) => n + w2.rows, 0));
    if (hC !== H) rules.push(`.deep{height:${hC}px}.edge{height:${hC - 1}px}`);
    if (!rules.length) return '';
    // Matches where round() first reaches c columns, nudge included.
    const q = k + 1 < steps.length
      ? `@media (min-width:${bound(c)}px) and (max-width:${bound(steps[k + 1].c)}px)`
      : `@media (min-width:${bound(c)}px)`;
    return `${q}{${rules.join('')}}`;
  }).filter(Boolean);

  const live = [
    `svg{--w:clamp(${px1(lo * cw)}px,round(down,calc(100vw - ${padx * 2}px + ${NUDGE}px),${px1(cw)}px),${px1(hi * cw)}px)}`,
    '.win{width:var(--w)}',
    ...Array.from({ length: maxk - 1 }, (_, k) =>
      `.x${k + 1}{transform:translate(calc(${-(k + 1)} * var(--w)),${(k + 1) * lh}px)}`),
    ...blocks,
  ];

  const hooks = names.map((n) => `.${n}{animation:${n} ${dur}s ${iter}}`).join('');
  const css = [
    fallback.join('\n'),
    `@supports (width:round(down,10px,3px)){\n${live.join('\n')}\n}`,
    hooks,
    kf.join('\n'),
  ].join('\n');

  const top = bar + pady;

  const clipped = `<clipPath id="win"><rect class="win" x="${padx}" y="0" height="${H}"/></clipPath>
<g clip-path="url(#win)"><g transform="translate(0,${top})">
${body}
</g></g>`;

  return { svg: frame(cfg, W, H, true, css, clipped), rows: rowsLo };
}
