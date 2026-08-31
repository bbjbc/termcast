# termcast

Terminal demos as animated SVG. You write a tape, the renderer turns it into an SVG
you can drop into a README.

- Live: https://termcast.xyz
- Repo: https://github.com/bbjbc/termcast (private)
- Editor pages: `/en`, `/ko`. Bare `/` redirects by `Accept-Language`.
- SVG endpoint: `/t/v<n>/<code>.svg`, where `<code>` is the deflated tape and `<n>` is
  `RENDERER_VERSION`. `/t/<code>.svg` still resolves, for addresses that predate it.

Read `README.md` for the product and the tape grammar. This file is for whoever picks
up the work.

## Where things stand

Everything is committed, pushed and deployed. The working tree is clean.

The last run through the code: wide glyphs advance by their real width, the workbench went
to three columns with the demo in the middle, lines wrap at the window width, the URL
carries a renderer version, and there is a test suite behind a 100% gate on the logic.

All three items that used to sit here are closed. Cache versioning is built, font embedding
was measured against a real screen and turned down, and the tests exist. See below for each.

`RENDERER_VERSION` is at 2. It went up when `runs()` was fixed, which is the mechanism
working as intended rather than anything to worry about.

Nothing is queued. Pick from "Open problems".

## Conventions

- **No em dashes** anywhere: prose, code comments, commit messages, UI strings, repo
  metadata. Use a colon, comma, or period.
- **Everything shipped is English.** UI strings, code comments, parser errors, README.
  Korean lives only in `README.ko.md` and the `ko` dictionary.
- The user writes and reads Korean, so talk to them in Korean. The artifacts stay English.
- **Commit subjects take a Conventional Commits prefix:** `feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`. Lowercase after the colon, imperative, no trailing
  period. The body stays prose: say what was wrong and why this is the fix, not a
  changelog of files.
- Commit messages carry no `Co-Authored-By` trailer.
- `pnpm lint`, `pnpm build` and `pnpm test` all have to pass. ESLint is pinned to 9.x
  because 10 breaks `eslint-config-next`'s parser.
- **`pnpm coverage` has to come back at 100%.** The gate covers the logic, not the React
  tree; see "Tests" below for where the line is drawn and why.

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

**Cache versioning is done.** `RENDERER_VERSION` in `src/lib/render.ts` goes into the
path, and `src/app/t/[...seg]/route.ts` accepts `/t/v<n>/<code>.svg` as well as the bare
`/t/<code>.svg`. Bump the constant whenever the same tape starts rendering differently:
that is the whole ritual. The route checks the version for shape and then drops it, because
it exists to change the address, not to select a renderer. An address that was published is
already frozen in the CDN, so no old renderer has to be kept alive.

**Font embedding was turned down.** It was on this list as measured but unbuilt. Rendering
it on a real Windows screen and comparing against DejaVu directly closed it:

- Hangul already lines up. Every Korean system font measured sits at 1.0em, which is what
  `WIDE_EM` assumes, so the expensive half of embedding buys nothing.
- `❯ ✓ ✗` are missing from every Windows monospace, but the browser finds them elsewhere
  and the shapes come out the same as DejaVu's. Nothing looks broken. The slant on `✗` is
  how U+2717 is drawn, not a fallback artifact.
- What is left is the 9 percent Consolas looseness, which is real in the numbers and not
  visible on screen.

The price would have been three to four times the payload: an SVG gzips to under 2 KB and a
subset adds 4 to 6 KB, base64 being incompressible. Also an OFL reserved-name rename for
Nanum, and Vercel file tracing for a 2.6 MB font. Do not restart this without a defect that
someone can actually see.

**Parser errors are English only.** They come out of `src/lib/tape.ts`, which is pure and
shared with the server route, so localizing them means returning codes and formatting in
the UI. Deferred deliberately.

**No spinner or progress command.** An install demo is the most common use and there is
no way to show a spinner. Needs a notion of overwriting a line in the renderer.

**The React tree has no tests.** Everything under `src/components` and `src/hooks` is
outside the coverage gate, and the browser check is what covers it. That is a deliberate
line, not an omission: see "Tests".

## Tests

`pnpm test` runs them, `pnpm coverage` runs them with the gate. Vitest, plain node, no DOM.

**The gate is 100% on the logic:** `src/lib`, the SVG route and the locale redirect. All
four counters, statements, branches, functions and lines. It fails the run rather than
printing a number nobody reads.

**The React tree is outside it on purpose.** Covering JSX means asserting markup shape,
which breaks on every layout change while catching nothing; the browser check earns more
there. If a component grows real logic, move that logic into `src/lib` and it comes under
the gate for free.

Tests live in `tests/`, mirroring `src/`. They are written against behaviour, not line
counts: reaching for a test that only exists to touch a line usually means the line should
not be there. Two branches were deleted rather than covered, both of them unreachable.

Writing these found two things worth knowing:

- `runs()` compared a run's average width against the next advance. Widths are running
  sums of an em fraction, so they drift, and a long stretch of one width split partway
  through for no visible reason. A preset carried four or five more `<text>` nodes than
  it needed. The run now carries the advance it was opened with.
- The cursor blink is `infinite` whatever `loop` says, so a test asserting that `loop off`
  produces no infinite animation passes for the wrong reason. Check the element
  animations, not the whole document.

## Design

The site is a monochrome terminal session: tmux status bar on top, vim mode line at the
bottom, IBM Plex Mono with Nanum Gothic Coding for Korean. Color carries no hierarchy;
lightness and weight do. The only colored things on the page are the rendered demo and
the swatches that pick its colors. Keep new UI inside that.

Design exploration lives in `design/` as Claude Design artboards. **It is gitignored: it
is local working material, not part of what ships.** It was dropped from the repo because
all of it is Korean, which breaks the English-only rule above, and because the artboards
reference a `support.js` that only Claude Design provides, so a stranger who cloned them
would get blank pages.

What is in there, if you still have the folder:

- `Main.dc.html` is the direction that was chosen. It is already built, in `globals.css`
  and the components, so the artboard adds nothing the code does not say.
- Four font candidates: JetBrains Mono, Fira Code, Source Code Pro, Ubuntu Mono. IBM Plex
  Mono won. The reasoning is in the `canvas.json` annotations.
- Eight directions that were tried and dropped: Panes, Stage, Teletype, Desk, Inverted,
  Brutal, Phosphor, Glass.
- `canvas.json` lays the artboards out on two pages and carries the Korean notes.
- `termcast-site-directions.html` is the seeded payload, regenerated from the artboards.
