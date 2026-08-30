import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE } from '@/lib/i18n';

/** Send the bare root to a locale, guessing from Accept-Language. */
export function middleware(request: NextRequest) {
  const locale = /(^|,)\s*ko\b/i.test(request.headers.get('accept-language') ?? '')
    ? 'ko'
    : DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: '/' };
