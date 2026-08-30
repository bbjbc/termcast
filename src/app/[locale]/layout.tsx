import type { Metadata } from 'next';
import { IBM_Plex_Mono, Nanum_Gothic_Coding } from 'next/font/google';
import { notFound } from 'next/navigation';

import { LOCALES, getDict, isLocale } from '@/lib/i18n';

import '../globals.css';

// Fonts people actually run terminals in: IBM Plex Mono for latin,
// Nanum Gothic Coding (fixed width) for Korean.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

// The Korean subset is heavy, so it is not preloaded — latin paints first.
const koMono = Nanum_Gothic_Coding({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ko',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const { meta } = getDict(isLocale(locale) ? locale : 'en');
  return {
    title: meta.title,
    description: meta.description,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${mono.variable} ${koMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
