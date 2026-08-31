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

## The embed carries its layouts in one file

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

What works is putting every layout in the one file and letting the SVG choose, because a
media query inside an SVG is matched against the box the page actually gave it. The
sidebar case then needs no special handling. It is simply another box width, and it lands
on whichever layout fits.

`/t/v<n>/w<a>-<b>-<c>/<code>.svg` renders those widths as layouts in one file.
`src/lib/embed.ts` picks the widths and writes the `<img>` the editor copies.

The cost is the height. Every layout shares the tallest one's, so a wide column gets empty
rows under the prompt. A terminal with room below the cursor still reads as a terminal, and
this is the part of the problem an `<img>` genuinely cannot solve.

The second cost is that nothing reflows at display time. The wrap is baked in when the tape
is built, so a layout shown in a box narrower than it was wrapped for is cut off rather
than shrunk. Every width has to stay at or below the narrowest column it will be shown in.

Three layouts is a judgement, not a law. The first sits just under the narrowest column,
the rest divide what is left evenly, and that holds the wasted width near twenty-four
characters anywhere in the range. A fourth is another copy of the text in the same file,
about half a kilobyte on the wire, and no extra line in anybody's README.

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
