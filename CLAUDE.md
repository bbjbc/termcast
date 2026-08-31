# termcast

Terminal demos as animated SVG. You write a tape, the renderer turns it into an SVG
you can drop into a README.

- Live: https://termcast-one.vercel.app
- Repo: https://github.com/bbjbc/termcast (private)
- Editor pages: `/en`, `/ko`. Bare `/` redirects by `Accept-Language`.
- SVG endpoint: `/t/<code>.svg`, where `<code>` is the deflated tape

Read `README.md` for the product and the tape grammar. This file is for whoever picks
up the work.

## Where things stand

Three commits are pushed and deployed. **One fix is uncommitted:** `src/lib/render.ts`
carries the CJK advance fix described below, verified locally but not on production.

Next, in order:

1. Commit the renderer fix and push. Vercel deploys on push.
2. **Add a renderer version to the URL before anyone relies on the current ones.**
   `/t/<code>.svg` is content addressed on the tape alone and served with
   `cache-control: immutable, max-age=31536000`, but the output also depends on the
   renderer. So the CJK fix above will never reach an already published URL. A version
   segment or query is needed for a renderer change to produce a new address.
3. Font subsetting and embedding. Measured and prototyped, see below.

## Conventions

- **No em dashes** anywhere: prose, code comments, commit messages, UI strings, repo
  metadata. Use a colon, comma, or period.
- **Everything shipped is English.** UI strings, code comments, parser errors, README.
  Korean lives only in `README.ko.md` and the `ko` dictionary.
- The user writes and reads Korean, so talk to them in Korean. The artifacts stay English.
- Commit messages carry no `Co-Authored-By` trailer.
- `pnpm lint` and `pnpm build` both have to pass. ESLint is pinned to 9.x because 10
  breaks `eslint-config-next`'s parser.

## Architecture, and why

**The tape string is the only state.** The settings panel holds no values of its own; it
writes directives into the tape through `setDirective`. The form and the text therefore
cannot disagree, and putting the tape in a URL carries the whole state. Keep it that way.

**`src/lib` has no React and no DOM.** That is what lets the browser preview and the
server route call the same code. Do not import framework code into it.

**One client boundary,** at `components/workbench/workbench.tsx`. Everything below it
takes props only, so there is a single place to look for where a value came from.

**Only declarative animation.** GitHub serves repository SVGs under
`default-src 'none'; style-src 'unsafe-inline'; sandbox`. Inline `<style>` and CSS
keyframes run; scripts do not. Never emit a `<script>` into an SVG.

## Verified facts, so they are not re-derived

Measured during development, with the method, so they can be rechecked.

**GitHub does not touch a repository SVG.** Fetched `docs/demo.svg` back through the API
and compared: byte identical, 27 `@keyframes` intact, served as `image/svg+xml` with
`style-src 'unsafe-inline'`.

**Font advances.** Read with fontkit from the real font files:

| Font | Latin | Hangul |
| --- | --- | --- |
| IBM Plex Mono | 0.600em | none |
| DejaVu Sans Mono | 0.602em | none |
| Consolas | 0.550em | none |
| Nanum Gothic Coding | 0.500em | 1.000em |
| Malgun Gothic | 0.880em | 1.000em |
| Noto Sans KR | 0.926em | 0.920em |

This is why `WIDE_EM` in `render.ts` is 1.0 and not 1.2. Reserving 1.2em for a Hangul
glyph and pinning it with `textLength` pushed the spare 0.2em into the gaps between
glyphs, and Korean came out visibly letter spaced. No font measured wants 1.2em.

**Symbol coverage.** `❯ ✓ ✗` are missing from IBM Plex Mono, Nanum Gothic Coding and
Consolas. Only DejaVu Sans Mono carries all three. Every preset uses those glyphs, so an
embedded font has to be chosen with that in mind.

**Embedded subset sizes,** measured with `subset-font` on real presets:

| | plain | with subset | gzip |
| --- | --- | --- | --- |
| English demo | 11.0 KB | 16.6 KB | 1.8 to 6.4 KB |
| Korean demo | 8.7 KB | 22.9 KB | 1.7 to 13.0 KB |

Small enough that size is not the obstacle. Data URI fonts do load under GitHub's CSP;
that was checked by replaying the exact header locally.

## Open problems

**Cache versioning.** Described under "Where things stand". This blocks any renderer
improvement from reaching published URLs, so it is the highest priority after the fix
is committed.

**Font embedding.** Everything is measured, nothing is built. It would make output
identical across machines, which system fallbacks cannot do: Consolas at 0.550em leaves
Windows about 9 percent looser than Linux for the same SVG.

**Parser errors are English only.** They come out of `src/lib/tape.ts`, which is pure and
shared with the server route, so localizing them means returning codes and formatting in
the UI. Deferred deliberately.

**No spinner or progress command.** An install demo is the most common use and there is
no way to show a spinner. Needs a notion of overwriting a line in the renderer.

**No tests.** Verification so far has been a headless browser plus measurement scripts.
`src/lib` is pure and would be straightforward to test.

## Design

The site is a monochrome terminal session: tmux status bar on top, vim mode line at the
bottom, IBM Plex Mono with Nanum Gothic Coding for Korean. Color carries no hierarchy;
lightness and weight do. The only colored things on the page are the rendered demo and
the swatches that pick its colors. Keep new UI inside that.

Design exploration lives in `design/` as Claude Design artboards. The seeded canvas
payload is gitignored since it is a build artifact.
