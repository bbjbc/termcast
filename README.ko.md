> [English](README.md) · **한국어**

# termcast

터미널 데모를 애니메이션 SVG로. 대본을 쓰면 README에 그대로 넣을 것이 나옵니다.

<img src="docs/demo.svg" width="430" alt="termcast 데모">

위 이미지는 9 kB입니다. 같은 데모를 GIF로 뜨면 몇 메가바이트가 됩니다.

## GIF가 아닌 이유

CLI 프로젝트는 보통 데모를 GIF로 보여줍니다. GIF는 무겁고, 256색이라 글자가 뭉개지고,
배경색이 파일에 구워져 있습니다. 다크 README에서 멀쩡하던 데모가 라이트에서는 어색해지죠.

SVG는 몇 킬로바이트고, 확대해도 선명하고, 두 팔레트를 함께 담아
`prefers-color-scheme`으로 바꿔 낄 수 있습니다.

대신 하나를 잃습니다. `<img>`로 불린 SVG는 이미지라서 안의 텍스트를 선택할 수 없습니다.
그게 맞바꾸는 값입니다.

## GitHub에서 애니메이션이 도는 이유

GitHub은 레포의 SVG에 이런 헤더를 붙여 내려줍니다.

```
Content-Type: image/svg+xml
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

`style-src 'unsafe-inline'`이 열려 있어서 인라인 `<style>` 블록이 살아 있고 CSS 키프레임이
재생됩니다. 스크립트는 `sandbox`가 막으므로, termcast는 선언적 애니메이션만 내보냅니다.

폰트도 같은 헤더의 결과입니다. 외부 폰트를 못 불러오니 SVG 안의 웹폰트 링크는 무시되고
시스템 모노스페이스로 떨어집니다.

## 녹화하지 않습니다

세션을 캡처하는 게 아니라 쓰는 겁니다. 오타도, 어색한 대기도, 깨끗한 화면을 얻으려고
명령을 다시 실행할 일도 없습니다. 아직 만들지 않은 옵션도 데모할 수 있고요.

그 대가는 정직성입니다. 대본은 어떤 출력이든 주장할 수 있습니다. 데모 속 숫자가 중요한
것이라면, 그걸 진짜 숫자로 만드는 건 쓰는 사람 몫입니다.

## 대본 문법

```
# 주석은 우물 정으로 시작합니다

title  mytool          창 제목, 비우면 표시하지 않습니다
prompt ❯               프롬프트 문자열
speed  55ms            글자당 타이핑 간격
hold   1.6s            마지막 줄 뒤 멈춤
theme  dark            dark | light | auto
chrome mac             mac | plain | none
font   14              글자 크기(px)
cols   0               가로 폭(글자 수), 0이면 내용에 맞춥니다
rows   0               최소 세로 높이(줄 수), 0이면 내용에 맞춥니다
radius 9               모서리 반경(px)
loop   on              on | off
color  bg #0d0d0d      bg bar bd dot ti fg dim ok err warn

type  npm i -g mytool     프롬프트 뒤에 타이핑
out   added 1 package     즉시 출력
dim   → 다음: build       흐리게 출력
ok    ✓ 완료              초록
err   ✗ 실패              빨강
warn  ! 주의              노랑
out                       빈 줄
wait  500ms               정지
type                      프롬프트만, 커서 깜빡임
```

프롬프트는 타이핑되지 않습니다. 줄이 시작될 때 이미 거기 있습니다 — 실제 터미널이 그렇듯이.

`speed`와 `prompt`는 대본 중간에 다시 쓰면 그 지점부터 적용됩니다. 설치는 느긋하게,
빌드 로그는 빠르게 흘릴 수 있습니다.

출력 앞의 공백을 살리려면 따옴표로 감싸세요: `out "    nested.txt"`

### 크기

`cols`와 `rows`는 터미널을 재는 방식 그대로 글자 수와 줄 수로 창 크기를 정합니다.
`cols 80`에 `rows 24`면 우리가 아는 그 크기고요.

`rows`는 상한이 아니라 하한입니다. 정적 SVG는 스크롤이 안 되니 높이를 딱 고정하면 넘치는
줄이 조용히 잘려나갑니다. 그래서 출력이 길면 창이 늘어납니다. 마지막 줄 아래에 여백을
두거나, README 안 여러 데모의 크기를 맞출 때 쓰면 됩니다.

### 한글

한글·한자·가나·전각기호·이모지는 터미널에서 두 칸을 차지합니다. termcast는 그 폭을 계산해
글자를 셀 격자에 올리므로, 눌리지도 않고 뒷부분을 밀어내지도 않습니다. 조각마다
`textLength`를 명시하기 때문에 보는 쪽 폰트가 무엇이든 칸이 유지됩니다.

## 주소

대본은 deflate로 압축해 base64url로 경로에 싣습니다. `/t/<code>.svg`가 데이터베이스 없이
그것을 렌더합니다. 입력이 같으면 출력이 같으므로 응답은 immutable로 캐시됩니다.

긴 대본은 URL 한도를 넘습니다. 그때는 에디터가 다운로드를 권합니다. 레포에 둔 파일은
이 서비스보다 오래 남는다는 장점도 있습니다 — 주소에는 없는 성질이죠.

## 개발

```bash
pnpm install
pnpm dev        # http://localhost:3210
pnpm build
```

런타임 의존성은 Next.js와 React뿐입니다. 압축은 `CompressionStream`을 쓰므로 압축
라이브러리도 없습니다.

## 구조

```
src/app/            라우트 — 에디터 페이지와 /t/[code]
src/components/     ui/ 프리미티브, 그 위에 tape · output · workbench
src/hooks/          대본 상태, URL 인코딩, 클립보드
src/lib/            파서, 렌더러, 하이라이터, 인코더 — 전부 순수 함수
```

`src/lib`에는 React도 DOM도 없습니다. 그래서 브라우저 미리보기와 서버 라우트가 같은 코드를
호출할 수 있습니다.

대본 문자열이 유일한 상태입니다. 설정 패널은 자기 값을 들고 있지 않고 대본에 지시어를
씁니다. 그래서 화면과 글이 어긋날 수 없고, 대본을 주소에 실으면 전부 딸려갑니다.

## 언어

사이트는 `/en`과 `/ko`로 나뉘고, 맨 위 상태줄에서 바꿀 수 있습니다. 언어를 바꿔도 쓰던
대본은 주소에 실려 그대로 넘어옵니다.

대본 문법 오류 메시지는 영어입니다. 명령 이름 자체가 영어라 그대로 두었습니다.
