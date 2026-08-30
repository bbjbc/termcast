import type { Locale } from './i18n';

export type Preset = { name: string; hint: string; tape: string };

/** Nobody writes a tape from a blank page. Most people pick one of these and rename things. */
const en: Preset[] = [
  {
    name: 'install',
    hint: 'Install, then first run. The most common README demo.',
    tape: `title  mytool
prompt ❯
speed  55ms
hold   1.6s

type  npm i -g mytool
wait  500ms
ok    ✓ added 1 package in 1.2s
out
type  mytool init
wait  350ms
ok    ✓ created mytool.config.ts
dim   → next: mytool build
type
`,
  },
  {
    name: 'scaffold',
    hint: 'The interactive prompts of a create-* tool.',
    tape: `title  create-myapp
prompt ❯
speed  50ms
hold   1.8s

type  npm create myapp
wait  600ms
out   ? Project name › my-app
wait  400ms
out   ? Template › TypeScript
wait  400ms
out
ok    ✓ my-app is ready
dim   → cd my-app && npm run dev
type
`,
  },
  {
    name: 'help',
    hint: 'One --help screen doubles as a feature list.',
    tape: `title  mytool --help
prompt ❯
speed  45ms
hold   2.2s
chrome plain

type  mytool --help
wait  300ms
dim   Usage: mytool <command> [options]
out
out     init      create a config file
out     build     bundle the project
out     check     type-check sources
out
dim     -w, --watch    rebuild on change
type
`,
  },
  {
    name: 'errors',
    hint: 'Showing what your tool catches is the best argument for it.',
    tape: `title  mytool check
prompt ❯
speed  50ms
hold   2.2s

type  mytool check
wait  450ms
err   ✗ src/api.ts:42  type mismatch
dim     expected string, got number
out
warn  ! src/old.ts:8  deprecated API
out
dim   1 error · 1 warning
type
`,
  },
  {
    name: 'benchmark',
    hint: 'Speed, told in numbers.',
    tape: `title  benchmark
prompt ❯
speed  45ms
hold   2.4s

type  mytool build
wait  400ms
ok    ✓ 1,204 modules in 0.31s
out
dim   compared
out     mytool     0.31s
dim     webpack    4.82s
dim     rollup     2.14s
type
`,
  },
  {
    name: 'profile',
    hint: 'An introduction for the top of a profile README.',
    tape: `prompt ~$
speed  60ms
hold   2s
chrome mac

type  whoami
wait  250ms
out   frontend engineer · seoul
out
type  cat stack.txt
wait  250ms
out   TypeScript · React · Next.js
out
type  contact --email
wait  250ms
dim   you@example.com
type
`,
  },
];

const ko: Preset[] = [
  {
    name: '설치',
    hint: '설치하고 처음 실행하는 장면. 가장 많이 쓰입니다.',
    tape: `title  mytool
prompt ❯
speed  55ms
hold   1.6s

type  npm i -g mytool
wait  500ms
ok    ✓ 패키지 1개 설치, 1.2초
out
type  mytool init
wait  350ms
ok    ✓ mytool.config.ts 생성
dim   → 다음: mytool build
type
`,
  },
  {
    name: '스캐폴딩',
    hint: 'create-* 류의 대화형 프롬프트.',
    tape: `title  create-myapp
prompt ❯
speed  50ms
hold   1.8s

type  npm create myapp
wait  600ms
out   ? 프로젝트 이름 › my-app
wait  400ms
out   ? 템플릿 › TypeScript
wait  400ms
out
ok    ✓ my-app 준비 완료
dim   → cd my-app && npm run dev
type
`,
  },
  {
    name: '도움말',
    hint: '--help 한 장이 곧 기능 요약입니다.',
    tape: `title  mytool --help
prompt ❯
speed  45ms
hold   2.2s
chrome plain

type  mytool --help
wait  300ms
dim   사용법: mytool <명령> [옵션]
out
out     init      설정 파일을 만듭니다
out     build     번들을 빌드합니다
out     check     타입을 검사합니다
out
dim     -w, --watch    파일 변경을 감시합니다
type
`,
  },
  {
    name: '오류 검사',
    hint: '도구가 왜 필요한지 가장 잘 보여주는 그림.',
    tape: `title  mytool check
prompt ❯
speed  50ms
hold   2.2s

type  mytool check
wait  450ms
err   ✗ src/api.ts:42  타입이 맞지 않습니다
dim     expected string, got number
out
warn  ! src/old.ts:8  더 이상 쓰이지 않는 API입니다
out
dim   오류 1 · 경고 1
type
`,
  },
  {
    name: '벤치마크',
    hint: '숫자로 말하는 속도.',
    tape: `title  benchmark
prompt ❯
speed  45ms
hold   2.4s

type  mytool build
wait  400ms
ok    ✓ 모듈 1,204개를 0.31초에
out
dim   비교
out     mytool     0.31s
dim     webpack    4.82s
dim     rollup     2.14s
type
`,
  },
  {
    name: '프로필',
    hint: '프로필 README 상단에 넣는 자기소개.',
    tape: `prompt ~$
speed  60ms
hold   2s
chrome mac

type  whoami
wait  250ms
out   프론트엔드 엔지니어 · 서울
out
type  cat stack.txt
wait  250ms
out   TypeScript · React · Next.js
out
type  contact --email
wait  250ms
dim   you@example.com
type
`,
  },
];

const PRESETS: Record<Locale, Preset[]> = { en, ko };

export const getPresets = (locale: Locale): Preset[] => PRESETS[locale];
