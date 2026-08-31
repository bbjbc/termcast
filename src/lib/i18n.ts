export const LOCALES = ['en', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

export const LOCALE_NAMES: Record<Locale, string> = { en: 'EN', ko: 'KO' };

/** Fill {name} placeholders. Kept out of the dictionaries so they stay plain data. */
export const fmt = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));

export type Dict = {
  meta: { title: string; description: string };
  tagline: { lead: string; strong: string };
  status: { lines: string; switchLanguage: string };
  panel: { tape: string; output: string; settings: string };
  preview: { alt: string; replay: string; replayTitle: string };
  tape: { aria: string; errorLine: string };
  hint: { type: string; out: string; dim: string; ok: string; err: string; warn: string; wait: string };
  group: { window: string; size: string; timing: string; colors: string };
  field: {
    theme: string; window: string; title: string; fontSize: string; width: string;
    height: string; corner: string; typing: string; endHold: string; prompt: string;
    loop: string; output: string;
  };
  value: { hidden: string; auto: string; cols: string; rows: string; resetColor: string };
  color: {
    fg: string; dim: string; ok: string; err: string; warn: string;
    bg: string; bar: string; bd: string; dot: string; ti: string;
  };
  exportBar: {
    tooLong: string; building: string; copy: string; copied: string; download: string; note: string;
  };
};

const en: Dict = {
  meta: {
    title: 'termcast: terminal demos as animated SVG',
    description: 'Write a tape, get a terminal demo for your README. A 3 MB GIF becomes 6 KB.',
  },
  tagline: { lead: 'Terminal demos as animated SVG.', strong: 'A 3 MB GIF becomes 6 KB.' },
  status: { lines: 'lines', switchLanguage: 'Switch language' },
  panel: { tape: 'tape', output: 'output', settings: 'settings' },
  preview: { alt: 'Terminal demo preview', replay: 'Replay', replayTitle: 'Play from the start' },
  tape: { aria: 'Tape', errorLine: 'line {n}' },
  hint: {
    type: 'types a command', out: 'prints a line', dim: 'prints it faint',
    ok: 'green', err: 'red', warn: 'yellow', wait: 'pauses',
  },
  group: { window: 'window', size: 'size', timing: 'timing', colors: 'output colors' },
  field: {
    theme: 'Theme', window: 'Window', title: 'Title', fontSize: 'Font size', width: 'Width',
    height: 'Height', corner: 'Corner', typing: 'Typing', endHold: 'End hold', prompt: 'Prompt',
    loop: 'Loop', output: 'Output',
  },
  value: {
    hidden: 'leave empty to hide', auto: 'auto',
    cols: '{n} cols', rows: '{n} rows', resetColor: 'reset {name}',
  },
  color: {
    fg: 'text', dim: 'dim', ok: 'success', err: 'error', warn: 'warning',
    bg: 'background', bar: 'title bar', bd: 'border', dot: 'buttons', ti: 'title',
  },
  exportBar: {
    tooLong: 'This tape is too long for a URL. Download the SVG and commit it to your repo.',
    building: 'building the URL…',
    copy: 'Copy markdown',
    copied: 'Copied',
    download: 'Download SVG',
    note: 'Paste the URL and it works right away. Keep the downloaded file in your repo and it outlives this service.',
  },
};

const ko: Dict = {
  meta: {
    title: 'termcast: 터미널 데모를 애니메이션 SVG로',
    description: '대본을 쓰면 README에 넣을 터미널 데모가 나옵니다. GIF 3MB가 6KB가 됩니다.',
  },
  tagline: { lead: '터미널 데모를 애니메이션 SVG로.', strong: 'GIF 3 MB가 6 KB가 됩니다.' },
  status: { lines: '줄', switchLanguage: '언어 바꾸기' },
  panel: { tape: '대본', output: '결과', settings: '설정' },
  preview: { alt: '터미널 데모 미리보기', replay: '다시 재생', replayTitle: '처음부터 다시 재생' },
  tape: { aria: '대본', errorLine: '{n}행' },
  hint: {
    type: '타이핑', out: '출력', dim: '흐린 출력',
    ok: '초록', err: '빨강', warn: '노랑', wait: '정지',
  },
  group: { window: '창', size: '크기', timing: '시간', colors: '결과물 색' },
  field: {
    theme: '테마', window: '창 스타일', title: '제목', fontSize: '글자 크기', width: '가로 폭',
    height: '세로 높이', corner: '모서리', typing: '타이핑 속도', endHold: '끝 정지',
    prompt: '프롬프트', loop: '반복', output: '결과물',
  },
  value: {
    hidden: '비우면 표시하지 않습니다', auto: '자동',
    cols: '{n}자', rows: '{n}줄', resetColor: '{name} 기본값으로',
  },
  color: {
    fg: '글자', dim: '흐린 글자', ok: '성공', err: '실패', warn: '주의',
    bg: '배경', bar: '제목줄', bd: '테두리', dot: '창 버튼', ti: '제목',
  },
  exportBar: {
    tooLong: '대본이 길어 주소 한도를 넘었습니다. SVG를 받아 레포에 넣어주세요.',
    building: '주소를 만드는 중…',
    copy: '마크다운 복사',
    copied: '복사했습니다',
    download: 'SVG 다운로드',
    note: '주소를 붙여넣으면 바로 쓸 수 있고, 받은 파일을 레포에 두면 이 서비스와 무관하게 영구히 남습니다.',
  },
};

export const DICTS: Record<Locale, Dict> = { en, ko };
export const getDict = (locale: Locale): Dict => DICTS[locale];
