'use client';

import { LOCALES, LOCALE_NAMES } from '@/lib/i18n';
import { useI18n } from '@/components/i18n';

import s from './workbench.module.css';

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** tmux status bar. It tells you, up front, that the whole page is one session. */
export function StatusBar({
  file, rows, total, bytes, tapeCode,
}: { file: string; rows: number; total: number; bytes: number; tapeCode: string }) {
  const { locale, t } = useI18n();

  return (
    <div className={s.bar}>
      <div className={s.session}>0:termcast</div>
      <div className={s.file}>{file}</div>
      <div className={s.gap} />
      <div className={s.meta}>
        <span>{rows} {t.status.lines}</span>
        <span>{sec(total)}</span>
        <b>{kb(bytes)}</b>
      </div>
      <div className={s.langs} role="group" aria-label={t.status.switchLanguage}>
        {LOCALES.map((code) => (
          // A full load, so every server-rendered string swaps at once.
          // The tape rides along in the query so a language switch never discards work.
          <a
            key={code}
            className={s.lang}
            data-on={code === locale}
            aria-current={code === locale ? 'true' : undefined}
            href={`/${code}${tapeCode ? `?tape=${tapeCode}` : ''}`}
            hrefLang={code}
          >
            {LOCALE_NAMES[code]}
          </a>
        ))}
      </div>
    </div>
  );
}

/** vim mode line. Inverted blocks top and bottom close the frame around the session. */
export function ModeLine({ file, line }: { file: string; line: number }) {
  return (
    <div className={`${s.bar} ${s.modeline}`}>
      <div className={s.mode}>NORMAL</div>
      <div className={s.file}>{file}</div>
      <div className={s.gap} />
      <div className={`${s.modeMeta} ${s.encoding}`}>utf-8</div>
      <div className={s.modeMeta}>{line}:1</div>
    </div>
  );
}

export function Wordmark() {
  const { t } = useI18n();
  return (
    <>
      <div className={s.wordmark}>
        <span className={s.prompt} aria-hidden>❯</span>
        <h1 className={s.name}>termcast</h1>
        <span className={s.caret} aria-hidden />
      </div>
      <p className={s.tagline}>
        {t.tagline.lead} <b>{t.tagline.strong}</b>
      </p>
    </>
  );
}
