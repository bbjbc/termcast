'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import s from './ui.module.css';

/* ── Segmented ─────────────────────────────────────────────────── */

type SegmentedProps<T extends string> = {
  value: T;
  options: readonly T[];
  label: string;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  value, options, label, onChange,
}: SegmentedProps<T>) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          data-on={option === value}
          className={s.segment}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/* ── Chip ──────────────────────────────────────────────────────── */

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean };

export function Chip({ on = false, ...rest }: ChipProps) {
  return <button type="button" data-on={on} className={s.chip} {...rest} />;
}

/* ── Slider ────────────────────────────────────────────────────── */

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  /** Render the value for humans. Cases like 0 meaning "auto" belong here. */
  format: (value: number) => string;
  onChange: (value: number) => void;
};

export function Slider({
  value, min, max, step = 1, label, format, onChange,
}: SliderProps) {
  return (
    <div className={s.slider}>
      <input
        type="range"
        className={s.range}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={s.readout}>{format(value)}</span>
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline';
};

export function Button({ variant = 'outline', ...rest }: ButtonProps) {
  return <button type="button" data-variant={variant} className={s.button} {...rest} />;
}

export function QuietButton({
  children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={s.quiet} {...rest}>
      {children}
    </button>
  );
}
