# Decisions

Why parts of this are the way they are, so nobody reopens a question that was already
answered. Each of these was closed with a measurement; the numbers are in
`measurements.md`.

## The renderer version rides in the address

`RENDERER_VERSION` in `src/lib/render.ts` goes into the path, and the route accepts
`/t/v<n>/<code>.svg` alongside the bare `/t/<code>.svg` that predates it.

A response is immutable for a year. Without a version in the address, a fix to the renderer
could never reach a URL somebody had already pasted into a README, because the CDN would go
on serving what it cached. Changing the version changes the address, so a new render gets a
new one and what is already published stays as it was.

The route checks the version for shape and then drops it. It exists to change the address,
not to select a renderer, so no old renderer has to be kept alive.

Bump the constant whenever the same tape starts rendering differently. That is the whole
ritual.

## Fonts are not embedded

This sat on the list as measured but unbuilt for a while. Rendering it on a real screen and
comparing against DejaVu closed it.

Hangul already lines up. Every Korean system font measured sits at 1.0em, which is what
`WIDE_EM` assumes, so the expensive half of embedding buys nothing. `❯ ✓ ✗` are missing
from every Windows monospace, but the browser finds them elsewhere and the shapes come out
the same. What is left is a nine percent looseness in Consolas, which is real in the
numbers and not visible on screen.

The price would have been three to four times the payload, since an SVG gzips to under
2 KB and a subset adds 4 to 6 KB with base64 being incompressible. On top of that an OFL
reserved-name rename for Nanum, and Vercel file tracing for a 2.6 MB font.

Do not restart this without a defect somebody can actually see.

## The embed reflows by clipping one strip

A README column is near 250px on a phone and near 840px on a desktop. One image has to
answer both.

Scaling is the obvious approach and it is wrong: a viewBox scales the whole drawing, so
14px text lands at 6px on a phone and the window goes flat. Dropping the viewBox fixes the
text but not the height, because an `<img>` box height is either a constant or a fixed
multiple of its width, and neither of those grows as the column narrows.

A `<picture>` with a variant per breakpoint does give each variant its own height, and it
was built that way first. Two things sank it. It needs an address per variant, which turned
a one line embed into nine lines of README. And `media` is matched against the viewport
while the SVG fills the column, which are not the same number: at a 768px viewport the
sidebar takes the column down to 406px, and a table of breakpoints tuned by hand got that
case wrong and cut text off.

The second attempt carried one pre-wrapped layout per column count in the one file, with a
media query inside the SVG picking the widest that fits, which works because those queries
are matched against the box the page actually gave the image. It also multiplied the file
by the number of layouts: holding the wasted right margin under a character took a layout
every two columns, thirty-six copies of the demo, and the parse time grew with them. The
numbers that killed it are in `measurements.md`, "Reflow instead of layouts".

What ships is `src/lib/flow.ts`: the text is laid down once, unwrapped, and wrapping is
done by a clip. A line that takes k rows is the same strip drawn k times, copy j shifted
left by j times the wrap width, and the wrap width is computed by the SVG's own CSS from
the box, `clamp(lo, round(down, 100vw - padding, cell), hi)`, because `100vw` in an SVG
loaded through `<img>` is the render box. Lines break where they meet the padding at every
width, the sidebar case needs no handling at all, and the file grows with the tape rather
than with the widths covered. Media queries remain only for what CSS cannot compute: the
per-line vertical offsets, which change at the column counts where some line gains or loses
a row, and the explicit shifts of lines holding two-cell glyphs, whose break offsets do not
ride on the wrap width. Engines without `round()` get the `@supports` fallback: the same
body pinned to the narrow end of the range, which is exactly what a one-layout embed was.

`/t/v<n>/w<lo>-<hi>/<code>.svg` names the range. Older addresses list every width they were
wrapped for; the route reads the ends of the list as the range, so they render the same.
`src/lib/embed.ts` writes the `<img>` the editor copies.

The cost is still the height. The box is settled before the SVG's CSS runs, so it is sized
for the narrow end of the range and cannot give the spare height back on a wide column.
This is the part of the problem an `<img>` genuinely cannot solve. What the breakpoints can
do is pull the drawn window up to its content, since each knows its row count, so the spare
height is transparent page under a window that fits, not empty rows under a prompt.

## The GitHub copy is a picture again

A `<picture>` keyed on the viewport was rejected early for picking wrap widths: a viewport
is not a column, the sidebar case broke the mapping, and mispredicting cut text off. The
reflow changes what a variant is. Every variant now wraps itself to whatever box it lands
in; the only thing left to choose is how much height the box reserves, and a mispredicted
breakpoint costs a couple of blank rows where it used to cost characters.

So the editor copies two forms. The GitHub copy is a `<picture>` with one variant per
viewport class, each variant's range starting at the narrowest column measured inside that
class (both page kinds, one column of slack), so the reserve follows the screen: zero on a
desktop, the phone price only on a phone. The browser downloads exactly one variant, so
the extra sources cost nothing on the wire. The plain one-line `<img>` stays for anywhere
that is not GitHub, because the bands are GitHub's own layout and a site with a narrow
column on a wide viewport would pick a variant wrapped too wide for its box. The fallback
inside the picture is that same one-liner, which is also what a sanitizer that strips
`<source>` leaves standing.

What no markup can remove: the reserve inside a band (a couple of rows at worst, the gap
between the band's floor and the box it actually got) and the line-box descender every
inline image on GitHub sits on. Measured flat against a GitHub-like page, the multi-line
markup itself adds nothing.

## The tape is bounded by what it decodes to, not by what it compresses to

`MAX_CODE` bounds the address. Deflate undoes that, and the renderer amplifies it again,
because every typed character becomes its own `<text>` node and its own `@keyframes`. A
3,776 character address expanded to 0.68 MB of tape and rendered a 175 MB SVG in four
seconds, and anybody could mint an unlimited supply of such addresses.

So `decodeTape` reads the stream in chunks and gives up past `MAX_TAPE`. The route answers
413, which is a different complaint from a code that will not decode at all.

The limit never fires on real work. A tape a person would write compresses three to four
times, so its address passes `MAX_CODE` while the tape itself is still well under
`MAX_TAPE`, and the URL ceiling goes on binding first. Past that ceiling the editor has
always pointed at the download instead, and that path has no limit at all.

## The SVG response is served under a policy

The route sets `default-src 'none'; style-src 'unsafe-inline'; sandbox` and `nosniff`.

The SVG carries text somebody else wrote and it is served from this site's own origin, so
opening one directly puts it here rather than in a sandbox. Nothing in the output is
unescaped and colours are matched against a hex pattern before they reach the stylesheet,
so there is no known way through. The policy costs nothing and means a mistake in either of
those cannot reach the network or run.

It is the same policy GitHub applies to a repository SVG, which is also the reason the
renderer only ever emits declarative animation.
