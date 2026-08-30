> **English** · [한국어](README.ko.md)

# termcast

Terminal demos as animated SVG. Write a tape, get something you can drop straight into a README.

<img src="docs/demo.svg" width="430" alt="termcast demo">

That image is 9 kB. The same demo as a GIF would be a few megabytes.

## Why not a GIF

CLI projects usually show their demo as a GIF. GIFs are heavy, capped at 256 colors so the
text goes mushy, and the background is baked in, so a demo that looks right on a dark README
looks wrong on a light one.

An SVG is a few kilobytes, stays sharp at any zoom, and can carry both palettes and switch on
`prefers-color-scheme`.

You do lose one thing: an SVG loaded through `<img>` is an image, so the text in it is not
selectable. That is the trade.

## Why animation works on GitHub

GitHub serves repository SVGs with these headers:

```
Content-Type: image/svg+xml
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

`style-src 'unsafe-inline'` is open, so an inline `<style>` block runs and CSS keyframes play.
Scripts are blocked by `sandbox`, so termcast only ever emits declarative animation.

Fonts are the other consequence of that header: no external font loads. Web font links inside
the SVG are ignored and the renderer falls back to a system monospace.

## Nothing is recorded

You are not capturing a session; you are writing one. No typos, no awkward waits, no
re-running a command to get a clean take — and you can demo a flag you have not built yet.

The cost of that is honesty: a tape can claim any output it likes. If a number in a demo
matters, it is on you to make it a real one.

## Tape syntax

```
# comments start with a hash

title  mytool          window title, hidden when empty
prompt ❯               prompt string
speed  55ms            per-character typing interval
hold   1.6s            pause after the last line
theme  dark            dark | light | auto
chrome mac             mac | plain | none
font   14              font size in px
cols   0               width in columns, 0 fits the content
rows   0               minimum height in lines, 0 fits the content
radius 9               corner radius in px
loop   on              on | off
color  bg #0d0d0d      bg bar bd dot ti fg dim ok err warn

type  npm i -g mytool     types after the prompt
out   added 1 package     prints immediately
dim   → next: build       prints faint
ok    ✓ done              green
err   ✗ failed            red
warn  ! careful           yellow
out                       blank line
wait  500ms               pause
type                      prompt alone, cursor blinking
```

The prompt is not typed. It is there when the line starts, the way a real terminal behaves.

`speed` and `prompt` can appear again mid-tape and apply from that point on, so an install can
crawl while a build log flies past.

To keep leading spaces in output, quote it: `out "    nested.txt"`

### Size

`cols` and `rows` size the window the way a terminal is sized — in characters and lines, not
pixels. `cols 80` and `rows 24` gives you the classic one.

`rows` is a floor, not a ceiling. A static SVG cannot scroll, so a hard limit would silently
drop lines; longer output grows the window instead. Setting it is useful for leaving some
breathing room under the last line, and for keeping several demos in one README the same size.

### CJK

Korean, Chinese, Japanese, fullwidth punctuation and emoji take two cells in a terminal.
termcast measures that and places glyphs on the cell grid, so they neither squash nor push the
rest of the line out of alignment. Every run carries an explicit `textLength`, which holds the
columns together whatever font the reader has.

## URLs

The tape is deflated and base64url-encoded into the path, so `/t/<code>.svg` renders it with
no database behind it. Same input, same output — the response is cached as immutable.

Long tapes exceed what a URL can hold. The editor notices and points you at the download
instead; a file in your repo also outlives this service, which a URL does not.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3210
pnpm build
```

Next.js and React are the only runtime dependencies. Compression uses `CompressionStream`,
so there is no compression library.

## Layout

```
src/app/            routes — the editor page and /t/[code]
src/components/     ui/ primitives, then tape · output · workbench
src/hooks/          tape state, URL encoding, clipboard
src/lib/            parser, renderer, highlighter, encoder — all pure
```

`src/lib` has no React and no DOM, which is why the browser preview and the server route can
call the same code.

The tape string is the only state. The settings panel does not hold values of its own; it
writes directives into the tape. So the form and the text cannot disagree, and putting the
tape in a URL carries everything.

## Languages

The site splits into `/en` and `/ko`, switchable from the status bar at the top. Switching
carries the tape you are working on along in the URL rather than dropping it.

Tape syntax errors stay in English. The command names are English, so the messages match them.
