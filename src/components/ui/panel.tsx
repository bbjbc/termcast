import type { ReactNode } from 'react';

import s from './ui.module.css';

type PanelProps = {
  label: string;
  /** Right side of the header: controls that belong to this panel. */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ label, action, footer, children, className }: PanelProps) {
  return (
    <section className={className ? `${s.panel} ${className}` : s.panel}>
      <header className={s.head}>
        <span className={s.label}>{label}</span>
        {action}
      </header>
      <div className={s.body}>{children}</div>
      {footer ? <footer className={s.foot}>{footer}</footer> : null}
    </section>
  );
}
