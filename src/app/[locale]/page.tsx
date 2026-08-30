import { I18nProvider } from '@/components/i18n';
import { Workbench } from '@/components/workbench/workbench';
import { decodeTape } from '@/lib/encode';
import { isLocale } from '@/lib/i18n';
import { getPresets } from '@/lib/presets';

export default async function Page({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';

  // ?tape=<code> makes an editor session shareable, and lets a language switch
  // carry the current tape across instead of resetting it.
  const { tape } = await searchParams;
  let initialTape = getPresets(locale)[0].tape;
  if (typeof tape === 'string') {
    try { initialTape = await decodeTape(tape); } catch { /* fall back to the preset */ }
  }

  return (
    <I18nProvider locale={locale}>
      <Workbench initialTape={initialTape} />
    </I18nProvider>
  );
}
