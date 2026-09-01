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

  // The picture form is several long addresses, and the person pasting it is
  // not the only person who will read the README source. A comment, invisible
  // in the rendered page, says why it is that shape; a tape that never wraps
  // collapses to the one-line img and needs no explaining.
  const github = picture.startsWith('<picture>')
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
        <code className={s.snippet}>{snippet || (pending ? t.exportBar.building : ' ')}</code>
      )}

      <div className={s.actions}>
        <Button variant="solid" disabled={!picture} onClick={() => grab(github, 'github')}>
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
