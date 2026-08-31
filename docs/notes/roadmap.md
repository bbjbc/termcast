# Roadmap

Not committed. Held here until it is decided whether these belong in GitHub Issues, which
is where they would go once the repo is public.

## Parser errors are English only

They come out of `src/lib/tape.ts`, which is pure and shared with the server route.
Localising them means returning codes and formatting in the UI. Deferred deliberately: the
route has no locale to format against, and the editor is the only place a parse error is
worth reading.

## No spinner or progress command

An install demo is the most common use and there is no way to show a spinner. It needs a
notion of overwriting a line, which the renderer does not have: every element is laid down
at a fixed row and revealed on a timer, and nothing ever replaces anything.

The same machinery would give scrollback, which is the only route to a demo taller than its
window.

## The React tree has no tests

Everything under `src/components` and `src/hooks` is outside the coverage gate, and a
browser check is what covers it in practice.

This is a deliberate line rather than an omission. Covering JSX means asserting markup
shape, which breaks on every layout change while catching nothing. If a component grows
real logic, move that logic into `src/lib` and it comes under the gate for free.
