'use client';

import { useI18n } from '@/components/i18n';

import s from './output.module.css';

type PreviewStageProps = {
  /** The SVG as a data: URI */
  src: string;
  /** Bumping this remounts the img, restarting the animation from the top */
  replayKey: number;
};

/** The preview has to match README conditions, so it goes through <img> too. */
export function PreviewStage({ src, replayKey }: PreviewStageProps) {
  const { t } = useI18n();
  return (
    <div className={s.stage}>
      {/* eslint-disable-next-line @next/next/no-img-element -- runtime-generated SVG, nothing for the optimizer to do */}
      <img key={`${src}#${replayKey}`} src={src} alt={t.preview.alt} />
    </div>
  );
}
