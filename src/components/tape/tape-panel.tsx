'use client';

import { useI18n } from '@/components/i18n';
import { Chip } from '@/components/ui/controls';
import { Panel } from '@/components/ui/panel';
import { fmt } from '@/lib/i18n';
import type { TapeError } from '@/lib/tapecast';

import { TapeEditor } from './tape-editor';
import s from './tape.module.css';

type TapePanelProps = {
  source: string;
  errors: TapeError[];
  onChange: (next: string) => void;
  className?: string;
};

export function TapePanel({ source, errors, onChange, className }: TapePanelProps) {
  const { t, presets } = useI18n();
  const active = presets.find((preset) => preset.tape === source);

  return (
    <Panel
      label={t.panel.tape}
      className={className}
      footer={
        <div className={s.hint}>
          <span><b>type</b> {t.hint.type}</span>
          <span><b>out</b> {t.hint.out}</span>
          <span><b>dim</b> {t.hint.dim}</span>
          <span><b>ok</b> {t.hint.ok}</span>
          <span><b>err</b> {t.hint.err}</span>
          <span><b>warn</b> {t.hint.warn}</span>
          <span><b>wait 400ms</b> {t.hint.wait}</span>
        </div>
      }
    >
      {/* A strip of its own rather than a header action: six names do not fit
          beside the label, and wrapping them there reads as a broken header. */}
      <div className={s.presets}>
        {presets.map((preset) => (
          <Chip
            key={preset.name}
            title={preset.hint}
            on={preset === active}
            onClick={() => onChange(preset.tape)}
          >
            {preset.name}
          </Chip>
        ))}
      </div>

      <TapeEditor value={source} onChange={onChange} />

      {errors.length > 0 && (
        <div className={s.errors} role="alert">
          {errors.map((error, index) => (
            <p key={index}>✗ {fmt(t.tape.errorLine, { n: error.line })} · {error.message}</p>
          ))}
        </div>
      )}
    </Panel>
  );
}
