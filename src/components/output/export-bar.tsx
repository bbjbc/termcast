'use client';

import { useCallback, useState } from 'react';

import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/controls';
import { useCopy } from '@/hooks/use-copy';

import s from './output.module.css';

type ExportBarProps = {
  svg: string;
  snippet: string;
  picture: string;
  tooLong: boolean;
  pending: boolean;
};

export function ExportBar({ svg, snippet, picture, tooLong, pending }: ExportBarProps) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();
  // Two things can be copied, so remember which one the confirmation is for.
  const [which, setWhich] = useState<'github' | 'plain'>('github');

  const grab = useCallback((text: string, kind: 'github' | 'plain') => {
    setWhich(kind);
    copy(text);
  }, [copy]);

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
        <code className={s.snippet}>{snippet || (pending ? t.exportBar.building : ' ')}</code>
      )}

      <div className={s.actions}>
        <Button variant="solid" disabled={!picture} onClick={() => grab(picture, 'github')}>
          {copied && which === 'github' ? t.exportBar.copied : t.exportBar.copy}
        </Button>
        <Button disabled={!snippet} onClick={() => grab(snippet, 'plain')}>
          {copied && which === 'plain' ? t.exportBar.copied : t.exportBar.copyPlain}
        </Button>
        <Button onClick={download}>{t.exportBar.download}</Button>
      </div>

      <p className={s.note}>{t.exportBar.note}</p>
    </div>
  );
}
