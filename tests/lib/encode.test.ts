import { describe, expect, it } from 'vitest';

import { MAX_CODE, decodeTape, encodeTape } from '@/lib/encode';

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

  it('round trips a tape past the chunk size of the base64 step', async () => {
    // The encoder walks the bytes in 0x8000 blocks, so cross that boundary
    const big = 'out ' + 'x'.repeat(0x8000 * 2) + '\n';
    expect(await decodeTape(await encodeTape(big))).toBe(big);
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
