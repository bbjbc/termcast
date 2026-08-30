'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, SyntheticEvent, UIEvent } from 'react';

import { useI18n } from '@/components/i18n';
import { highlightTape } from '@/lib/highlight';

import s from './tape.module.css';

const ROW = 25; // must match --row in globals.css

type TapeEditorProps = {
  value: string;
  onChange: (next: string) => void;
};

/**
 * A textarea cannot color individual characters, so a highlight layer sits behind a
 * transparent input. Both share font, line height and padding, which is what makes
 * the glyphs land on top of each other.
 *
 * wrap="off" is a requirement, not a preference: once lines wrap, visual rows stop
 * matching real rows and the gutter numbers drift.
 */
export function TapeEditor({ value, onChange }: TapeEditorProps) {
  const { t } = useI18n();
  const layerRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);

  const lines = useMemo(() => highlightTape(value), [value]);

  // Scroll sync goes straight through refs, so no re-render on every wheel tick
  const syncScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
    if (gutterRef.current) {
      gutterRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  }, []);

  const trackCaret = useCallback((event: SyntheticEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    setActiveLine(el.value.slice(0, el.selectionStart).split('\n').length - 1);
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
      trackCaret(event);
    },
    [onChange, trackCaret],
  );

  return (
    <div className={s.editor}>
      <div className={s.gutter} aria-hidden>
        <div className={s.gutterInner} ref={gutterRef}>
          {lines.map((_, index) => (
            <span key={index} data-on={index === activeLine}>
              {index + 1}
            </span>
          ))}
        </div>
      </div>

      <div className={s.area}>
        <div className={s.layer} aria-hidden>
          <div className={s.layerInner} ref={layerRef}>
            <div className={s.band} style={{ top: 14 + activeLine * ROW }} />
            <pre className={s.code}>
              {lines.map((tokens, index) => (
                <div key={index}>
                  {tokens.length === 0
                    ? ' '
                    : tokens.map((token, i) => (
                        <i key={i} className={s[token.kind]}>{token.text}</i>
                      ))}
                </div>
              ))}
            </pre>
          </div>
        </div>

        <textarea
          className={s.input}
          value={value}
          onChange={handleChange}
          onScroll={syncScroll}
          onSelect={trackCaret}
          onClick={trackCaret}
          onKeyUp={trackCaret}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label={t.tape.aria}
        />
      </div>
    </div>
  );
}
