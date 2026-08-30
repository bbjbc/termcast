import { decodeTape, MAX_CODE } from '@/lib/encode';
import { tapeToSvg } from '@/lib/tapecast';

// Next's local edge emulation has no DecompressionStream. Responses are cached as
// immutable, so the work happens once per URL and the Node runtime is plenty.
export const runtime = 'nodejs';

const fail = (msg: string, status: number) =>
  new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const raw = (await ctx.params).code;
  const code = raw.replace(/\.svg$/, '');

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
      // Same input, same output — safe to cache forever
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
