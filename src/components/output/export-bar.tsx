'use client';

import { useCallback } from 'react';

import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/controls';
import { useCopy } from '@/hooks/use-copy';

import s from './output.module.css';

type ExportBarProps = {
  svg: string;
  url: string;
  picture: string;
  tooLong: boolean;
  pending: boolean;
};

export function ExportBar({ svg, url, picture, tooLong, pending }: ExportBarProps) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();

  // The picture form is several long addresses, and the person pasting it is
  // not the only person who will read the README source. A comment, invisible
  // in the rendered page, says why it is that shape; a tape that never wraps
  // collapses to a single img line and needs no explaining.
  const markdown = picture.startsWith('<picture>')
    ? `${t.exportBar.pictureComment}\n${picture}`
    : picture;

  const download = useCallback(() => {
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = 'demo.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }, [svg]);

  return (
    <div className={s.export}>
      {tooLong ? (
        <p className={s.note}>{t.exportBar.tooLong}</p>
      ) : (
        <code className={s.snippet}>{url || (pending ? t.exportBar.building : ' ')}</code>
      )}

      <div className={s.actions}>
        <Button variant="solid" disabled={!picture} onClick={() => copy(markdown)}>
          {copied ? t.exportBar.copied : t.exportBar.copy}
        </Button>
        <Button onClick={download}>{t.exportBar.download}</Button>
      </div>

      <p className={s.note}>{t.exportBar.note}</p>
    </div>
  );
}
