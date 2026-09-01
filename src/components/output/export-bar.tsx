'use client';

import { useCallback, useState } from 'react';

import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/controls';
import { useCopy } from '@/hooks/use-copy';

import s from './output.module.css';

type FileSet = { snippet: string; render: () => { name: string; svg: string }[] };

type ExportBarProps = {
  svg: string;
  snippet: string;
  picture: string;
  fileSet: FileSet | null;
  tooLong: boolean;
  pending: boolean;
};

const save = (name: string, svg: string) => {
  const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

export function ExportBar({ svg, snippet, picture, fileSet, tooLong, pending }: ExportBarProps) {
  const { t } = useI18n();
  const { copied, copy } = useCopy();
  // Three things can be copied, so remember which one the confirmation is for.
  const [which, setWhich] = useState<'github' | 'plain' | 'files'>('github');

  const grab = useCallback((text: string, kind: 'github' | 'plain' | 'files') => {
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

  // The committed form: the variants download as files for the repo, and the
  // copied block leads with how to place them.
  const grabFiles = useCallback(() => {
    if (!fileSet) return;
    fileSet.render().forEach((f, i) => setTimeout(() => save(f.name, f.svg), i * 300));
    grab(`${t.exportBar.filesComment}\n${fileSet.snippet}`, 'files');
  }, [fileSet, grab, t]);

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
        <Button disabled={!fileSet} onClick={grabFiles}>
          {copied && which === 'files' ? t.exportBar.filesDone : t.exportBar.files}
        </Button>
        <Button onClick={() => save('demo.svg', svg)}>{t.exportBar.download}</Button>
      </div>

      <p className={s.note}>{t.exportBar.note}</p>
    </div>
  );
}
