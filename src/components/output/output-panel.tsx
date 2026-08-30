'use client';

import { useState } from 'react';

import { useI18n } from '@/components/i18n';
import { QuietButton } from '@/components/ui/controls';
import { Panel } from '@/components/ui/panel';
import type { Config } from '@/lib/tapecast';

import { ExportBar } from './export-bar';
import { PreviewStage } from './preview-stage';
import { Settings } from './settings';

type OutputPanelProps = {
  svg: string;
  dataUrl: string;
  width: number;
  cfg: Config;
  url: string;
  tooLong: boolean;
  pending: boolean;
  onPatch: (key: string, value: string | null) => void;
  className?: string;
};

export function OutputPanel({
  svg, dataUrl, width, cfg, url, tooLong, pending, onPatch, className,
}: OutputPanelProps) {
  const { t } = useI18n();
  const [replay, setReplay] = useState(0);

  return (
    <Panel
      label={t.panel.output}
      className={className}
      action={
        <QuietButton onClick={() => setReplay((n) => n + 1)} title={t.preview.replayTitle}>
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          {t.preview.replay}
        </QuietButton>
      }
    >
      <PreviewStage src={dataUrl} replayKey={replay} />
      <Settings cfg={cfg} onPatch={onPatch} />
      <ExportBar svg={svg} url={url} width={width} tooLong={tooLong} pending={pending} />
    </Panel>
  );
}
