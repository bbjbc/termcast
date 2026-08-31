# Design

The site is a terminal session: a tmux status bar along the top, a vim mode line along the
bottom, IBM Plex Mono set throughout with Nanum Gothic Coding picking up Korean.

Colour carries no hierarchy. Lightness and weight do all of that work, and the only
coloured things on the page are the rendered demo and the swatches that pick its colours.
A demo is the thing you came to look at, so it is the thing that gets to be in colour. Keep
new interface inside that.

## The icon

A block cursor, which is already the live thing in the wordmark: one rectangle on a dark
square, at the 1:2.17 that both the site's own caret and the rendered cursor use.

It started as a generated PNG at 1:3 and was redrawn. At 1:3 it reads as a hairline once it
is down at 16px in a browser tab, and a shape this simple has no business being 800 KB of
raster when it is a few hundred bytes of vector. It lives in `src/app/icon.svg`.

`src/app/apple-icon.png` is the same geometry at 180px, because iOS will not take an SVG.

## Fonts

IBM Plex Mono won over JetBrains Mono, Fira Code, Source Code Pro and Ubuntu Mono. It has
the narrowest personality of the five, which is what you want under a demo that is itself
a terminal: the page should not compete with the thing it is framing.

Nanum Gothic Coding handles Korean. It is a monospace with a 1.0em Hangul advance, so it
sits on the same grid the renderer assumes rather than fighting it.
