import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { config, middleware } from '@/middleware';
import { DEFAULT_LOCALE } from '@/lib/i18n';

const at = (accept?: string) => {
  const headers = new Headers();
  if (accept !== undefined) headers.set('accept-language', accept);
  const res = middleware(new NextRequest(new Request('http://localhost/', { headers })));
  return new URL(res.headers.get('location')!).pathname;
};

describe('the bare root redirect', () => {
  it('sends a Korean browser to /ko', () => {
    expect(at('ko')).toBe('/ko');
    expect(at('ko-KR,ko;q=0.9,en;q=0.8')).toBe('/ko');
    expect(at('en-US,en;q=0.9,ko;q=0.8')).toBe('/ko');
  });

  it('sends everyone else to the default', () => {
    expect(at('en-US,en;q=0.9')).toBe(`/${DEFAULT_LOCALE}`);
    expect(at('de')).toBe(`/${DEFAULT_LOCALE}`);
    expect(at('')).toBe(`/${DEFAULT_LOCALE}`);
  });

  it('sends a browser that sent no preference to the default', () => {
    expect(at(undefined)).toBe(`/${DEFAULT_LOCALE}`);
  });

  it('is not fooled by ko inside another tag', () => {
    expect(at('kok')).toBe(`/${DEFAULT_LOCALE}`);   // Konkani, not Korean
    expect(at('tok')).toBe(`/${DEFAULT_LOCALE}`);
  });

  it('redirects rather than rewrites', () => {
    const res = middleware(new NextRequest(new Request('http://localhost/')));
    expect(res.status).toBe(307);
  });

  it('runs on the root and nowhere else', () => {
    expect(config.matcher).toBe('/');
  });
});
