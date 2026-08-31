import { describe, expect, it } from 'vitest';

import { MAX_CODE, MAX_TAPE, TapeTooLong, decodeTape, encodeTape } from '@/lib/encode';

describe('encodeTape and decodeTape', () => {
  it.each([
    ['a plain tape', 'title  mytool\ntype  npm i\n'],
    ['an empty string', ''],
    ['korean', '설치가 끝났습니다\n'],
    ['emoji and symbols', '❯ ✓ ✗ 🚀\n'],
    ['newlines and tabs', 'a\n\tb\r\nc'],
  ])('round trips %s', async (_label, tape) => {
    expect(await decodeTape(await encodeTape(tape))).toBe(tape);
  });

  it('round trips a tape at the size limit', async () => {
    const big = 'out ' + 'x'.repeat(MAX_TAPE - 5) + '\n';
    expect(big.length).toBe(MAX_TAPE);
    expect(await decodeTape(await encodeTape(big))).toBe(big);
  });

  it('encodes past the chunk size of the base64 step', async () => {
    // The encoder walks the compressed bytes in 0x8000 blocks. Crossing that
    // takes input that will not compress, since the limit is on what decodes.
    let noise = '';
    for (let i = 0; i < 0x8000 * 2; i += 1) noise += String.fromCharCode(33 + ((i * 7919) % 94));
    expect(await encodeTape(noise)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('refuses a small code that inflates into a huge tape', async () => {
    // MAX_CODE bounds the compressed bytes; deflate undoes that, so the tape
    // itself has to be bounded too or a short address becomes an enormous SVG.
    const bomb = await encodeTape('out ' + 'x'.repeat(MAX_TAPE * 4) + '\n');
    expect(bomb.length).toBeLessThan(MAX_CODE);
    await expect(decodeTape(bomb)).rejects.toBeInstanceOf(TapeTooLong);
  });

  it('produces a code that is safe in a URL path', async () => {
    const code = await encodeTape('out ' + 'ÿþ'.repeat(400));
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('actually compresses a repetitive tape', async () => {
    const tape = 'out hello\n'.repeat(200);
    expect((await encodeTape(tape)).length).toBeLessThan(tape.length / 4);
  });

  it('refuses a code that is not deflate data', async () => {
    await expect(decodeTape('bm90LWRlZmxhdGU')).rejects.toThrow();
  });

  it('publishes a ceiling for how long a code may be', () => {
    expect(MAX_CODE).toBeGreaterThan(0);
  });
});
