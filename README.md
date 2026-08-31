<div align="center">

# termcast

**Terminal demos as animated SVG.**

Write a tape, get something you can drop straight into a README.<br>
A 3 MB GIF becomes 6 KB, stays sharp at any zoom, and follows light and dark.

[![English](https://img.shields.io/badge/lang-English-e8ebe7?style=flat-square&labelColor=0d0d0d)](README.md)
[![한국어](https://img.shields.io/badge/lang-%ED%95%9C%EA%B5%AD%EC%96%B4-6b736d?style=flat-square&labelColor=0d0d0d)](README.ko.md)
[![License](https://img.shields.io/badge/license-MIT-6b736d?style=flat-square&labelColor=0d0d0d)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-6b736d?style=flat-square&labelColor=0d0d0d)](https://nextjs.org)
[![Live](https://img.shields.io/badge/live-termcast--one.vercel.app-e8ebe7?style=flat-square&labelColor=0d0d0d)](https://termcast-one.vercel.app)

<img src="docs/demo.svg" width="460" alt="termcast demo">

</div>

## Why

CLI projects usually show their demo as a GIF. GIFs are heavy, capped at 256 colors so the
text goes mushy, and the background is baked in, so a demo that looks right on a dark README
looks wrong on a light one.

| | GIF | termcast |
| --- | --- | --- |
| Size | megabytes | kilobytes |
| Zoom | blurs | stays sharp |
| Themes | one, baked in | follows `prefers-color-scheme` |
| Editing | re-record | change a line |

The one thing you give up: an SVG loaded through `<img>` is an image, so the text in it is
not selectable.

## Quick start

Open [termcast](https://termcast-one.vercel.app), pick a preset, edit the tape, and copy the markdown it gives you.

```html
<img src="https://termcast-one.vercel.app/t/<code>.svg" width="430" alt="demo">
```

Or use **Download SVG** and commit the file, which works with no service behind it.

```bash
git clone https://github.com/bbjbc/termcast
cd termcast
pnpm install
pnpm dev        # http://localhost:3210
```

## Writing a tape

```
title  mytool
prompt ❯
speed  55ms

type  npm i -g mytool
wait  500ms
ok    ✓ added 1 package in 1.2s
out
type  mytool init
ok    ✓ created mytool.config.ts
dim   → next: mytool build
type
```

### Content

| Command | Does |
| --- | --- |
| `type <text>` | types after the prompt, one character at a time |
| `out <text>` | prints a line immediately |
| `dim <text>` | prints it faint |
| `ok <text>` | green |
| `err <text>` | red |
| `warn <text>` | yellow |
| `out` | blank line |
| `wait 500ms` | pause |
| `type` | prompt alone, cursor blinking |

### Settings

| Directive | Default | Does |
| --- | --- | --- |
| `title` | none | window title, hidden when empty |
| `prompt` | `$` | prompt string |
| `speed` | `55ms` | per-character typing interval |
| `hold` | `1.5s` | pause after the last line |
| `theme` | `dark` | `dark` · `light` · `auto` |
| `chrome` | `mac` | `mac` · `plain` · `none` |
| `font` | `14` | font size in px |
| `cols` | `0` | width in columns, 20 to 200, 0 fits the content |
| `rows` | `0` | minimum height in lines, 0 fits the content |
| `radius` | `9` | corner radius in px |
| `loop` | `on` | `on` · `off` |
| `color <key> <hex>` | none | `bg bar bd dot ti fg dim ok err warn` |

A few things worth knowing:

- **The prompt is not typed.** It is there when the line starts, the way a real terminal behaves.
- **`speed` and `prompt` can appear again mid-tape** and apply from that point on, so an
  install can crawl while a build log flies past.
- **`cols` and `rows` size the window the way a terminal is sized,** in characters and lines.
  `cols 80` and `rows 24` gives you the classic one. `rows` is a floor, not a ceiling: a static
  SVG cannot scroll, so longer output grows the window rather than losing lines. `cols` is a
  ceiling: a line past it wraps onto the next one, at the character, the way a terminal does.
  With `cols 0` the window grows to the content instead and nothing wraps.
- **Quote to keep leading spaces:** `out "    nested.txt"`

### CJK

Korean, Chinese, Japanese, fullwidth punctuation and emoji take two cells in a terminal.
termcast measures that and places glyphs on the cell grid, so they neither squash nor push the
rest of the line out of alignment. Every run carries an explicit `textLength`, which holds the
columns together whatever font the reader has.

## How it works

**Animation survives on GitHub** because of the headers GitHub serves repository SVGs with:

```
Content-Type: image/svg+xml
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

`style-src 'unsafe-inline'` is open, so an inline `<style>` block runs and CSS keyframes play.
Scripts are blocked by `sandbox`, so termcast only ever emits declarative animation.

Fonts are the other consequence of that header: no external font loads, so web font links
inside the SVG are ignored and the renderer falls back to a system monospace.

**Links need no database.** The tape is deflated and base64url-encoded into the path, so
`/t/<code>.svg` renders it on the spot. Same input, same output, so the response is cached as
immutable. Long tapes exceed what a URL can hold; the editor notices and points you at the
download instead.

**Nothing is recorded.** You are not capturing a session, you are writing one. No typos, no
awkward waits, no re-running a command to get a clean take, and you can demo a flag you have
not built yet. The cost is honesty: a tape can claim any output it likes. If a number in a
demo matters, it is on you to make it a real one.

## Project layout

```
src/app/            routes: the editor page and /t/[code]
src/components/     ui/ primitives, then tape · output · workbench
src/hooks/          tape state, URL encoding, clipboard
src/lib/            parser, renderer, highlighter, encoder, all pure
```

`src/lib` has no React and no DOM, which is why the browser preview and the server route can
call the same code.

The tape string is the only state. The settings panel does not hold values of its own; it
writes directives into the tape. So the form and the text cannot disagree, and putting the
tape in a URL carries everything.

Next.js and React are the only runtime dependencies. Compression uses `CompressionStream`,
so there is no compression library.

```bash
pnpm dev        # http://localhost:3210
pnpm build
pnpm lint
```

## Languages

The site splits into `/en` and `/ko`, switchable from the status bar at the top. Switching
carries the tape you are working on along in the URL rather than dropping it.

Tape syntax errors stay in English. The command names are English, so the messages match them.

## License

[MIT](LICENSE) © bbjbc
