# termcast

Terminal demos as animated SVG. You write a tape, the renderer turns it into an SVG you can
drop into a README.

- Live: https://termcast.xyz
- Editor pages: `/en`, `/ko`. Bare `/` redirects by `Accept-Language`.
- SVG endpoint: `/t/v<n>/<code>.svg`, where `<code>` is the deflated tape and `<n>` is
  `RENDERER_VERSION`. `/t/v<n>/w<lo>-<hi>/<code>.svg` adds the column range a responsive
  embed reflows across; older addresses list every width they were wrapped for and the ends
  of the list read as the same range. `/t/<code>.svg` still resolves, for addresses that
  predate the version.

This file is the rules: what you have to hold to while writing code here. The reasoning
behind them is elsewhere, and it is worth reading before changing anything load bearing.

- `README.md` for the product and the tape grammar
- `docs/notes/decisions.md` for why things are the way they are, so a closed question stays closed
- `docs/notes/measurements.md` for what was measured, and how to measure it again
- `docs/notes/design.md` for the visual system

## Conventions

- **No em dashes** anywhere: prose, code comments, commit messages, UI strings, repo
  metadata. Use a colon, comma, or period. The one exception is the `nextjs-agent-rules`
  block at the end of this file, which `next dev` writes and rewrites.
- **Everything shipped is English.** UI strings, code comments, parser errors, README,
  everything under `docs/`. Korean lives only in `README.ko.md` and the `ko` dictionary.
- The maintainer reads and writes Korean, so a session with them runs in Korean. What the
  repo ships stays English, per the rule above.
- **Commit subjects take a Conventional Commits prefix:** `feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`. Lowercase after the colon, imperative, no trailing
  period. The body stays prose: say what was wrong and why this is the fix, not a
  changelog of files.
- Commit messages carry no `Co-Authored-By` trailer.
- `pnpm lint`, `pnpm build` and `pnpm test` all have to pass. ESLint is pinned to 9.x
  because 10 breaks `eslint-config-next`'s parser.
- **`pnpm coverage` has to come back at 100%.** See "Tests" for where the line is drawn.

## Architecture

Four things that are easy to break by accident and expensive to put back.

**The tape string is the only state.** The settings panel holds no values of its own; it
writes directives into the tape through `setDirective`. The form and the text therefore
cannot disagree, and putting the tape in a URL carries the whole state. Keep it that way.

**`src/lib` has no React and no DOM.** That is what lets the browser preview and the server
route call the same code. Do not import framework code into it.

**One client boundary,** at `components/workbench/workbench.tsx`. Everything below it takes
props only, so there is a single place to look for where a value came from.

**Only declarative animation.** GitHub serves repository SVGs under
`default-src 'none'; style-src 'unsafe-inline'; sandbox`. Inline `<style>` and CSS
keyframes run; scripts do not. Never emit a `<script>` into an SVG.

## The version bump

`RENDERER_VERSION` in `src/lib/render.ts` rides in the path. Bump it whenever the same tape
starts rendering differently. That is the whole ritual, and it is not something to worry
about when it happens: a published address is already frozen in the CDN, so changing the
version is how a fix reaches anybody at all.

## Tests

`pnpm test` runs them, `pnpm coverage` runs them with the gate. Vitest, plain node, no DOM.

**The gate is 100% on the logic:** `src/lib`, the SVG route and the locale redirect. All
four counters, statements, branches, functions and lines. It fails the run rather than
printing a number nobody reads.

**The React tree is outside it on purpose.** Covering JSX means asserting markup shape,
which breaks on every layout change while catching nothing. If a component grows real
logic, move that logic into `src/lib` and it comes under the gate for free.

Tests live in `tests/`, mirroring `src/`, and are written against behaviour rather than
line counts. Reaching for a test that only exists to touch a line usually means the line
should not be there. Two branches were deleted rather than covered, both unreachable.

Two traps found while writing them, both still worth knowing:

- `runs()` used to compare a run's average width against the next advance. Widths are
  running sums of an em fraction, so they drift, and a long stretch of one width split
  partway through for no visible reason. The run now carries the advance it was opened
  with.
- The cursor blink is `infinite` whatever `loop` says, so a test asserting that `loop off`
  produces no infinite animation passes for the wrong reason. Check the element
  animations, not the whole document.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
