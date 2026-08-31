'use client';

import { useI18n } from '@/components/i18n';
import { Panel } from '@/components/ui/panel';
import type { Config } from '@/lib/tapecast';

import { Settings } from './settings';

type SettingsPanelProps = {
  cfg: Config;
  onPatch: (key: string, value: string | null) => void;
  className?: string;
};

/** The right rail. Every control here writes a directive into the tape. */
export function SettingsPanel({ cfg, onPatch, className }: SettingsPanelProps) {
  const { t } = useI18n();

  return (
    <Panel label={t.panel.settings} className={className}>
      <Settings cfg={cfg} onPatch={onPatch} />
    </Panel>
  );
}
