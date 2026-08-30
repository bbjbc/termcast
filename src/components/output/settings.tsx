'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/components/i18n';
import { Segmented, Slider } from '@/components/ui/controls';
import { fmt } from '@/lib/i18n';
import { THEMES, type Config, type Palette } from '@/lib/tapecast';

import s from './output.module.css';

// Order is deliberate: the colors people reach for first come first.
const COLOR_KEYS: (keyof Palette)[] =
  ['fg', 'dim', 'ok', 'err', 'warn', 'bg', 'bar', 'bd', 'dot', 'ti'];

type Patch = (key: string, value: string | null) => void;

/** A bordered box with its label notched into the top edge, the way a terminal draws one. */
function Group({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <fieldset className={wide ? `${s.group} ${s.wide}` : s.group}>
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

export function Settings({ cfg, onPatch }: { cfg: Config; onPatch: Patch }) {
  const { t } = useI18n();
  // With auto, show the light defaults — the picker has to commit to one of them
  const base = cfg.theme === 'auto' ? 'light' : cfg.theme;

  return (
    <div className={s.settings}>
      <Group label={t.group.window}>
        <Field label={t.field.theme}>
          <Segmented
            label={t.field.theme}
            value={cfg.theme}
            options={['dark', 'light', 'auto'] as const}
            onChange={(v) => onPatch('theme', v)}
          />
        </Field>

        <Field label={t.field.window}>
          <Segmented
            label={t.field.window}
            value={cfg.chrome}
            options={['mac', 'plain', 'none'] as const}
            onChange={(v) => onPatch('chrome', v)}
          />
        </Field>

        <Field label={t.field.title}>
          <input
            type="text"
            className={s.text}
            value={cfg.title}
            placeholder={t.value.hidden}
            onChange={(e) => onPatch('title', e.target.value || null)}
          />
        </Field>

        <Field label={t.field.prompt}>
          <input
            type="text"
            className={s.text}
            value={cfg.prompt}
            placeholder={t.value.hidden}
            onChange={(e) => onPatch('prompt', e.target.value || null)}
          />
        </Field>
      </Group>

      <Group label={t.group.size}>
        <Field label={t.field.fontSize}>
          <Slider
            label={t.field.fontSize} value={cfg.font} min={10} max={24}
            format={(v) => `${v}px`}
            onChange={(v) => onPatch('font', String(v))}
          />
        </Field>

        {/* cols and rows size the window the way a terminal is sized: 80 x 24 */}
        <Field label={t.field.width}>
          <Slider
            label={t.field.width} value={cfg.cols} min={0} max={120}
            format={(v) => (v === 0 ? t.value.auto : fmt(t.value.cols, { n: v }))}
            onChange={(v) => onPatch('cols', v === 0 ? null : String(v))}
          />
        </Field>

        <Field label={t.field.height}>
          <Slider
            label={t.field.height} value={cfg.rows} min={0} max={40}
            format={(v) => (v === 0 ? t.value.auto : fmt(t.value.rows, { n: v }))}
            onChange={(v) => onPatch('rows', v === 0 ? null : String(v))}
          />
        </Field>

        <Field label={t.field.corner}>
          <Slider
            label={t.field.corner} value={cfg.radius} min={0} max={24}
            format={(v) => `${v}px`}
            onChange={(v) => onPatch('radius', String(v))}
          />
        </Field>
      </Group>

      <Group label={t.group.timing}>
        <Field label={t.field.typing}>
          <Slider
            label={t.field.typing} value={cfg.speed} min={10} max={200} step={5}
            format={(v) => `${v}ms`}
            onChange={(v) => onPatch('speed', `${v}ms`)}
          />
        </Field>

        <Field label={t.field.endHold}>
          <Slider
            label={t.field.endHold} value={cfg.hold} min={0} max={5000} step={100}
            format={(v) => `${v}ms`}
            onChange={(v) => onPatch('hold', `${v}ms`)}
          />
        </Field>

        <Field label={t.field.loop}>
          <Segmented
            label={t.field.loop}
            value={cfg.loop ? 'on' : 'off'}
            options={['on', 'off'] as const}
            onChange={(v) => onPatch('loop', v)}
          />
        </Field>
      </Group>

      <Group label={t.group.colors} wide>
        <div className={s.colors}>
          {COLOR_KEYS.map((key) => {
            const overridden = cfg.colors[key] != null;
            return (
              <span key={key} className={s.color} data-on={overridden}>
                <input
                  type="color"
                  aria-label={t.color[key]}
                  value={cfg.colors[key] ?? THEMES[base][key]}
                  onChange={(e) => onPatch(`color ${key}`, e.target.value)}
                />
                <span className={s.colorName}>{t.color[key]}</span>
                {overridden && (
                  <button
                    type="button"
                    className={s.reset}
                    title={fmt(t.value.resetColor, { name: t.color[key] })}
                    onClick={() => onPatch(`color ${key}`, null)}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </Group>
    </div>
  );
}
