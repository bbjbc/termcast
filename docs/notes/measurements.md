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

## Payload with several layouts

One file carrying more than one layout is mostly repetition, so it compresses well. The
site is served with brotli, which was confirmed against the deployed response headers.

| preset | one layout | two | three |
| --- | --- | --- | --- |
| install | 1.5 KB | 1.9 KB | 2.1 KB |
| scaffold | 1.3 KB | 1.6 KB | 1.7 KB |
| profile | 1.6 KB | 2.2 KB | 2.4 KB |

Brotli, on the wire. Each extra layout costs roughly half a kilobyte and no extra line in
anybody's README.
