'use client';

import { OutputPanel } from '@/components/output/output-panel';
import { TapePanel } from '@/components/tape/tape-panel';
import { useTape } from '@/hooks/use-tape';
import { useTapeUrl } from '@/hooks/use-tape-url';

import { ModeLine, StatusBar, Wordmark } from './chrome';
import s from './workbench.module.css';

const FILE = 'tape.tape';

/**
 * The one client boundary that holds state.
 * The whole page is interactive, so drawing the line here is the honest place for it:
 * everything below takes props only, and there is a single spot to look when you
 * need to know where a value came from.
 */
export function Workbench({ initialTape }: { initialTape: string }) {
  const tape = useTape(initialTape);
  const link = useTapeUrl(tape.source);

  return (
    <div className={s.shell}>
      <StatusBar
        file={FILE}
        rows={tape.rows}
        total={tape.total}
        bytes={tape.bytes}
        tapeCode={link.code}
      />

      <main className={s.main}>
        <Wordmark />

        <div className={s.cols}>
          <TapePanel source={tape.source} errors={tape.errors} onChange={tape.load} />
          <OutputPanel
            svg={tape.svg}
            dataUrl={tape.dataUrl}
            width={tape.width}
            cfg={tape.cfg}
            url={link.url}
            tooLong={link.tooLong}
            pending={link.pending}
            onPatch={tape.patch}
          />
        </div>
      </main>

      <ModeLine file={FILE} line={tape.source.split('\n').length} />
    </div>
  );
}
