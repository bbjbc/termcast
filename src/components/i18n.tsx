'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { getDict, type Dict, type Locale } from '@/lib/i18n';
import { getPresets, type Preset } from '@/lib/presets';

type I18n = { locale: Locale; t: Dict; presets: Preset[] };

const Ctx = createContext<I18n | null>(null);

/**
 * Only the locale string crosses the server/client boundary; the dictionary is
 * looked up here. That keeps the props serializable and leaves room for the
 * dictionaries to grow without widening the payload from the server.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: getDict(locale), presets: getPresets(locale) }),
    [locale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Ctx);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
