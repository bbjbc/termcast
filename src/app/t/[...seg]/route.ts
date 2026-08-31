import { decodeTape, MAX_CODE } from '@/lib/encode';
import { tapeToSvg } from '@/lib/tapecast';

// Next's local edge emulation has no DecompressionStream. Responses are cached as
// immutable, so the work happens once per URL and the Node runtime is plenty.
export const runtime = 'nodejs';

const fail = (msg: string, status: number) =>
  new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

const VERSION = /^v\d+$/;

/**
 * `/t/v1/<code>.svg`, and `/t/<code>.svg` for the addresses that predate the
 * version segment.
 *
 * The version is checked for shape and then dropped. It exists to give a changed
 * renderer a new address, not to pick a renderer: an address that was published
 * is already frozen in the CDN, so there is nothing here to keep old versions for.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ seg: string[] }> }) {
  const seg = (await ctx.params).seg ?? [];
  const [head, tail] = seg.length === 2 ? seg : [null, seg[0]];

  if (seg.length > 2 || !tail) return fail('not found', 404);
  if (head !== null && !VERSION.test(head)) return fail('not found', 404);

  const code = tail.replace(/\.svg$/, '');
  if (!code) return fail('not found', 404);
  if (code.length > MAX_CODE) return fail('tape too long', 414);

  let tape: string;
  try {
    tape = await decodeTape(code);
  } catch {
    return fail('cannot decode tape', 400);
  }

  const { svg, errors } = tapeToSvg(tape);
  if (errors.length) return fail(`line ${errors[0].line}: ${errors[0].message}`, 400);

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // Same tape and same renderer version, so this is safe to cache forever
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
