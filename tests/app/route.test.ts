import { describe, expect, it } from 'vitest';

import { GET } from '@/app/t/[...seg]/route';
import { encodeTape } from '@/lib/encode';
import { MAX_CODE } from '@/lib/encode';
import { RENDERER_VERSION } from '@/lib/tapecast';

const call = (seg: string[] | undefined) =>
  GET(new Request('http://localhost/t'), { params: Promise.resolve({ seg: seg as string[] }) });

const TAPE = 'chrome none\n\nout hello\n';

describe('the SVG route', () => {
  it('renders a versioned address', async () => {
    const res = await call([`v${RENDERER_VERSION}`, `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('hello');
  });

  it('renders an address from before the version segment', async () => {
    const res = await call([`${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(200);
  });

  it('renders any version with the current renderer', async () => {
    const code = `${await encodeTape(TAPE)}.svg`;
    const [a, b] = await Promise.all([call(['v1', code]), call(['v99', code])]);
    expect(await a.text()).toBe(await b.text());
  });

  it('works without the .svg suffix', async () => {
    expect((await call([await encodeTape(TAPE)])).status).toBe(200);
  });

  it('serves it as an SVG, cached for good', async () => {
    const res = await call([`v1`, `${await encodeTape(TAPE)}.svg`]);
    expect(res.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('refuses a first segment that is not a version', async () => {
    const res = await call(['nope', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not found');
  });

  it('refuses more segments than it knows what to do with', async () => {
    const res = await call(['v1', 'extra', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
  });

  it('refuses no segments at all', async () => {
    expect((await call([])).status).toBe(404);
  });

  it('refuses a missing segment list', async () => {
    expect((await call(undefined)).status).toBe(404);
  });

  it('refuses a bare suffix with no code in front of it', async () => {
    expect((await call(['.svg'])).status).toBe(404);
  });

  it('turns away a code longer than a URL should carry', async () => {
    const res = await call(['v1', `${'A'.repeat(MAX_CODE + 1)}.svg`]);
    expect(res.status).toBe(414);
    expect(await res.text()).toBe('tape too long');
  });

  it('reports a code it cannot decode', async () => {
    const res = await call(['v1', 'bm90LWRlZmxhdGU.svg']);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('cannot decode tape');
  });

  it('reports the first parse error with its line', async () => {
    const res = await call(['v1', `${await encodeTape('out a\n???\n')}.svg`]);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('line 2: cannot parse "???"');
  });

  it('answers an error as plain text', async () => {
    const res = await call(['nope', 'x']);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });
});

describe('the SVG route: a width in the address', () => {
  const LONG = 'chrome none\n\nout the quick brown fox jumps over the lazy dog\n';

  it('renders a fluid window instead of a fixed one', async () => {
    const res = await call(['v1', 'w40', `${await encodeTape(TAPE)}.svg`]);
    const svg = await res.text();
    expect(res.status).toBe(200);
    expect(svg).toContain('width="100%"');
    expect(svg).not.toContain('viewBox');
  });

  it('wraps to the width in the address, so a narrow one is taller', async () => {
    const code = `${await encodeTape(LONG)}.svg`;
    const [narrow, wide] = await Promise.all([call(['v1', 'w24', code]), call(['v1', 'w80', code])]);
    const h = async (r: Response) => Number((await r.text()).match(/height="(\d+)"/)![1]);
    expect(await h(narrow)).toBeGreaterThan(await h(wide));
  });

  it('takes a width range as one reflowing image', async () => {
    const res = await call(['v1', 'w24-60', `${await encodeTape(LONG)}.svg`]);
    const svg = await res.text();
    expect(res.status).toBe(200);
    expect(svg).toContain('@supports (width:round');
    expect(svg).toContain('clip-path="url(#win)"');
  });

  it('refuses a width past the ceiling anywhere in the list', async () => {
    const res = await call(['v1', 'w24-201', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('width out of range');
  });

  it('refuses a second segment that is not a width', async () => {
    const res = await call(['v1', 'nope', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not found');
  });

  it('refuses a width past what a tape may ask for', async () => {
    const res = await call(['v1', 'w201', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('width out of range');
  });

  it('refuses more segments than a width leaves room for', async () => {
    const res = await call(['v1', 'w40', 'extra', `${await encodeTape(TAPE)}.svg`]);
    expect(res.status).toBe(404);
  });
});

describe('the SVG route: limits and headers', () => {
  it('reports a code that inflates past what a tape may be', async () => {
    const bomb = await encodeTape('out ' + 'x'.repeat(70000) + '\n');
    const res = await call(['v1', `${bomb}.svg`]);
    expect(res.status).toBe(413);
    expect(await res.text()).toBe('decoded tape too long');
  });

  it('serves the SVG under a policy that cannot run or fetch anything', async () => {
    const res = await call(['v1', `${await encodeTape(TAPE)}.svg`]);
    expect(res.headers.get('content-security-policy'))
      .toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
