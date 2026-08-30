'use client';

import { useCallback } from 'react';

import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/controls';
import { useCopy } from '@/hooks/use-copy';

import s from './output.module.css';

type ExportBarProps = {
  svg: string;
  url: string;
  width: number;
  tooLong: boolean;
  pending: boolean;
};

export function ExportBar({ svg, url, width, tooLong, pending }: ExportBarProps) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();
  const markdown = url ? `<img src="${url}" width="${width}" alt="demo">` : '';

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
        <code className={s.snippet}>{markdown || (pending ? t.exportBar.building : ' ')}</code>
      )}

      <div className={s.actions}>
        <Button variant="solid" disabled={!markdown} onClick={() => copy(markdown)}>
          {copied ? t.exportBar.copied : t.exportBar.copy}
        </Button>
        <Button onClick={download}>{t.exportBar.download}</Button>
      </div>

      <p className={s.note}>{t.exportBar.note}</p>
    </div>
  );
}
