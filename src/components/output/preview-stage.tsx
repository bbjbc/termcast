'use client';

import { useI18n } from '@/components/i18n';

import s from './output.module.css';

type PreviewStageProps = {
  /** The SVG as a data: URI */
  src: string;
  /** Natural width of the demo in px, used to cap how far it is scaled up */
  width: number;
  /** Bumping this remounts the img, restarting the animation from the top */
  replayKey: number;
};

/** How far past its own size a demo may be blown up to fill the stage. */
const MAX_ZOOM = 2;

/** The preview has to match README conditions, so it goes through <img> too. */
export function PreviewStage({ src, width, replayKey }: PreviewStageProps) {
  const { t } = useI18n();
  return (
    <div className={s.stage}>
      {/* eslint-disable-next-line @next/next/no-img-element -- runtime-generated SVG, nothing for the optimizer to do */}
      <img
        key={`${src}#${replayKey}`}
        src={src}
        alt={t.preview.alt}
        style={width ? { maxWidth: width * MAX_ZOOM } : undefined}
      />
    </div>
  );
}
