# Measurements

Things that were measured rather than assumed, with enough of the method to check them
again. Numbers that constrain one line of code live in a comment beside that line; what is
here is the wider finding a decision was built on.

## GitHub does not touch a repository SVG

`docs/demo/demo.svg` was fetched back through the API and compared against the committed file.
Byte identical, all 27 `@keyframes` intact, served as `image/svg+xml` under
`default-src 'none'; style-src 'unsafe-inline'; sandbox`.

That header is why the animation survives and why nothing may depend on script. Inline
`<style>` runs. Scripts do not. External fonts do not load, so a web font link inside an
SVG is ignored and the renderer falls back to a system monospace.

## Font advances

Read with fontkit from the font files themselves.

| Font | Latin | Hangul |
| --- | --- | --- |
| IBM Plex Mono | 0.600em | none |
| DejaVu Sans Mono | 0.602em | none |
| Consolas | 0.550em | none |
| Nanum Gothic Coding | 0.500em | 1.000em |
| Malgun Gothic | 0.880em | 1.000em |
| Noto Sans KR | 0.926em | 0.920em |

No font measured wants 1.2em for a Hangul glyph, which is why `WIDE_EM` in
`src/lib/metrics.ts` is 1.0. Reserving 1.2em and pinning it with `textLength` pushed the
spare 0.2em into the gaps between glyphs, and Korean came out visibly letter spaced.

## Symbol coverage

`❯ ✓ ✗` are missing from IBM Plex Mono, Nanum Gothic Coding and Consolas. Of the fonts
above only DejaVu Sans Mono carries all three. Every preset uses those glyphs, so any
font that might be embedded has to be chosen with that in mind.

In practice the browser finds them elsewhere and the shapes come out the same as DejaVu's.
The slant on `✗` is how U+2717 is drawn, not a fallback artifact.

## Embedded subset sizes

Measured with `subset-font` against real presets.

| | plain | with subset | gzip |
| --- | --- | --- | --- |
| English demo | 11.0 KB | 16.6 KB | 1.8 to 6.4 KB |
| Korean demo | 8.7 KB | 22.9 KB | 1.7 to 13.0 KB |

Data URI fonts do load under GitHub's CSP. That was checked by replaying the exact header
locally.

## SVG in an `<img>`

Checked in Chromium 151, Firefox 153 and WebKit 26.5. All three agreed on every point
below, and on box dimensions to the tenth of a pixel.

**A media query inside the SVG is matched against the box the page gave the image.** Not
the viewport, and not the viewBox. The same SVG in a 358px box matched `(max-width:500px)`;
in an 870px box it did not. This is what lets one address serve a responsive embed.

**Without a viewBox there is no scaling.** A user unit is a CSS pixel wherever it is drawn,
so 14px text is 14px in any box. With a viewBox the whole drawing scales instead, and a
800px demo in a 358px column puts 14px text on screen at 6px.

**`width="100%"` on the `<img>` is then required.** A no-viewBox SVG has no intrinsic
width, so without it the image falls back to the default object size of 300px.

**The box cannot get taller as it gets narrower.** Its height is either a constant or a
fixed multiple of its width. A media query inside the SVG cannot change it either: the box
is settled before the SVG's own CSS runs. Setting `svg{height:...}` from a media query was
ignored in all three engines.

**`100vw` is the render box too**, the same length the media queries match against, and it
works inside `calc()`. `round(down, calc(100vw - 44px), 8.4px)` computed the wrap width of
the reflowing embed correctly in all three engines, as did geometry properties fed from it:
`width` on a `clipPath` rect and `transform` on a group, both through `var()`.

**CSS `round()` divides without the slack `wrapText` has.** A 254px box leaves 210px of
usable width, `210 / 8.4` comes out at `24.999...` in doubles, and `round(down, ...)`
returned 24 columns where the renderer's own arithmetic says 25 (`metrics.ts` allows a
`1e-6` overshoot for exactly this reason). All three engines agreed on the wrong answer,
which at least made it easy to see. Adding `0.02px` to the length before rounding restored
the column in all three; a cell is 8.4px, so the nudge cannot cross a real boundary.

**Resizing the box restarts the animation.** Shrinking the window around a fluid embed
re-renders the SVG at the new width, glyphs at their authored size, wrap following the box,
and the CSS timeline starts over from zero. All three engines. The layout-per-width format
behaved the same way, so this is a property of SVG-in-`<img>`, not of the reflow.

**A run pinned with `textLength` drifts off the cell grid.** `lengthAdjust="spacing"`
spreads the correction over the gaps, so a glyph can sit up to a cell's worth of spacing
error, near 0.7px with Consolas, away from its column. No fixed layout can see it; a clip
edge can, as a hair of the neighbouring row's glyph at the row edge. The reflowing renderer
therefore writes an x per glyph instead of a `textLength` per run.

## What GitHub keeps, and what it sends

`width="100%"`, `<picture>` and `<source media>` all survive the sanitizer. Checked by
pasting badges into a README preview and reading the result on a desktop and a phone.

GitHub also serves `<meta name="viewport" content="width=device-width">`. This matters more
than it looks: a page without that meta is laid out at a 980px fallback width and then
scaled down bodily to the screen, text and all. On a phone that looks exactly like the
problem the responsive embed exists to solve, so any local page used to test an embed needs
the meta or it will lie.

## The README column

Measured on github.com while logged out, reading the rendered content width of the
`.markdown-body` element at each viewport.

| viewport | column | viewport | column |
| --- | --- | --- | --- |
| 320 | 254 | 768 | 406 |
| 375 | 309 | 860 | 498 |
| 500 | 434 | 900 | 538 |
| 600 | 502 | 1024 | 582 |
| 700 | 602 | 1200 | 758 |
| 767 | 669 | 1280 | 838 |

It does not climb in a straight line. At 768 the About sidebar arrives and the column drops
from 602 back to 406, so a viewport is not a column and anything keyed on `media` gets that
case wrong. It is flat at 838 from 1280 up.

A repository with no About section will be wider than this, which only leaves more space at
the right. Erring narrow is safe; erring wide cuts text off.

## A short address can render an enormous SVG

`MAX_CODE` bounds the compressed code, and deflate undoes that. Every typed character
becomes its own `<text>` node and its own `@keyframes`, so the expansion compounds.

| address | tape | SVG | time |
| --- | --- | --- | --- |
| 536 chars | 0.08 MB | 20 MB | 0.3s |
| 1,815 chars | 0.31 MB | 81 MB | 1.1s |
| 3,776 chars | 0.68 MB | 175 MB | 4.3s |

All three are inside the 4,000 character ceiling. `MAX_TAPE` in `src/lib/encode.ts` is the
answer to this.

Real tapes never approach it. A tape a person would write compresses three to four times,
not two hundred, so the URL ceiling stops it first:

| | tape | address | |
| --- | --- | --- | --- |
| the largest preset | 307 B | 267 chars | |
| a 200 line tape | 8.7 KB | 2,900 chars | fits |
| a 300 line tape | 13.1 KB | 4,178 chars | stopped by `MAX_CODE` |

## Reflow instead of layouts

The layout-per-width format paid for its right margin in copies of the demo. One script,
17 logical lines with a few long ones, font 14, columns 24 to 94, rendered by
`renderLayers` at several spacings and by `renderFlow` once:

| format | worst right gap | raw | brotli | nodes |
| --- | --- | --- | --- | --- |
| 3 layouts | 36 cols | 97.9 KB | 4.9 KB | 314 |
| 11 layouts | 7 cols | 350.6 KB | 9.9 KB | 1,103 |
| 19 layouts | 4 cols | 605.8 KB | 14.5 KB | 1,892 |
| 36 layouts | 2 cols | 1,149.6 KB | 23.0 KB | 3,575 |
| reflow | under 1 cell | 47.7 KB | 3.9 KB | 219 |

The wire cost was never the problem; raw size and node count are what the parse and paint
time follow, and they stop depending on how many widths are covered at all. A Korean tape
is heavier in rules, because every wrap of a two-cell line needs explicit shifts: the same
range came to 68.7 KB raw and 3.3 KB brotli, still a copy of the text rather than seventy.

Checked in the same three engines as everything else, against the old renderer's output
side by side at 254, 300, 406, 561, 602 and 838px: same wrap, same colors, same timing, and
one column more used wherever the old format had rounded down to its nearest layout.
