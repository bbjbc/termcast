import { decodeTape, MAX_CODE, TapeTooLong } from '@/lib/encode';
import { MAX_COLS, tapeToSvg } from '@/lib/tapecast';

// Next's local edge emulation has no DecompressionStream. Responses are cached as
// immutable, so the work happens once per URL and the Node runtime is plenty.
export const runtime = 'nodejs';

const fail = (msg: string, status: number) =>
  new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

const VERSION = /^v\d+$/;
const WIDTH = /^w([1-9]\d*(?:-[1-9]\d*)*)$/;

/**
 * `/t/v1/<code>.svg`, and `/t/<code>.svg` for the addresses that predate the
 * version segment.
 *
 * The version is checked for shape and then dropped. It exists to give a changed
 * renderer a new address, not to pick a renderer: an address that was published
 * is already frozen in the CDN, so there is nothing here to keep old versions for.
 *
 * `/t/v1/w24/<code>.svg` adds a width. It overrides the tape's own `cols` and
 * renders the window fluid. `/t/v1/w24-43/<code>.svg` asks for both widths in
 * one image, which is what keeps a README embed down to a single `<img>`.
 *
 * The width belongs in the address rather than in the tape because it is a
 * property of where the SVG is being shown, not of what is being demonstrated.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ seg: string[] }> }) {
  const seg = (await ctx.params).seg ?? [];
  const tail = seg[seg.length - 1];
  const head = seg.slice(0, -1);

  if (seg.length > 3 || !tail) return fail('not found', 404);
  if (head.length > 0 && !VERSION.test(head[0])) return fail('not found', 404);

  const width = head.length === 2 ? WIDTH.exec(head[1]) : null;
  if (head.length === 2 && !width) return fail('not found', 404);
  const cols = width ? width[1].split('-').map(Number) : undefined;
  if (cols && cols.some((c) => c > MAX_COLS)) return fail('width out of range', 404);

  const code = tail.replace(/\.svg$/, '');
  if (!code) return fail('not found', 404);
  if (code.length > MAX_CODE) return fail('tape too long', 414);

  let tape: string;
  try {
    tape = await decodeTape(code);
  } catch (e) {
    // A code inside the URL ceiling can still inflate into something no terminal
    // demo would be, which is a different complaint from one that will not decode.
    if (e instanceof TapeTooLong) return fail('decoded tape too long', 413);
    return fail('cannot decode tape', 400);
  }

  const { svg, errors } = tapeToSvg(tape, { cols });
  if (errors.length) return fail(`line ${errors[0].line}: ${errors[0].message}`, 400);

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // Same tape and same renderer version, so this is safe to cache forever
      'cache-control': 'public, max-age=31536000, immutable',
      // The SVG carries text somebody else wrote and is served from this site's
      // own origin, so a mistake in escaping should not be able to reach the
      // network or run.
      // @see docs/notes/decisions.md, "The SVG response is served under a policy"
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'x-content-type-options': 'nosniff',
    },
  });
}
