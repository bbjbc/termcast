<div align="center">

# termcast

**터미널 데모를 애니메이션 SVG로.**

대본을 쓰면 README에 그대로 넣을 것이 나옵니다.<br>
GIF 3 MB가 6 KB가 되고, 확대해도 선명하고, 라이트·다크를 따라갑니다.

[![English](https://img.shields.io/badge/lang-English-6b736d?style=flat-square&labelColor=0d0d0d)](README.md)
[![한국어](https://img.shields.io/badge/lang-%ED%95%9C%EA%B5%AD%EC%96%B4-e8ebe7?style=flat-square&labelColor=0d0d0d)](README.ko.md)
[![License](https://img.shields.io/badge/license-MIT-6b736d?style=flat-square&labelColor=0d0d0d)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-6b736d?style=flat-square&labelColor=0d0d0d)](https://nextjs.org)
[![Live](https://img.shields.io/badge/live-termcast.xyz-e8ebe7?style=flat-square&labelColor=0d0d0d)](https://termcast.xyz)

<img src="docs/demo/demo.svg" width="460" alt="termcast 데모">

</div>

## 왜

CLI 프로젝트는 보통 데모를 GIF로 보여줍니다. GIF는 무겁고, 256색이라 글자가 뭉개지고,
배경색이 파일에 구워져 있습니다. 다크 README에서 멀쩡하던 데모가 라이트에서는 어색해지죠.

| | GIF | termcast |
| --- | --- | --- |
| 용량 | 메가바이트 | 킬로바이트 |
| 확대 | 뭉개짐 | 선명함 |
| 테마 | 하나, 구워져 있음 | `prefers-color-scheme`를 따름 |
| 수정 | 다시 녹화 | 한 줄 고침 |

대신 하나를 잃습니다. `<img>`로 불린 SVG는 이미지라서 안의 텍스트를 선택할 수 없습니다.

## 빠른 시작

[termcast](https://termcast.xyz)를 열고, 프리셋을 고르고, 대본을 고친 뒤 나온 마크다운을 복사하면 됩니다.

```html
<img src="https://termcast.xyz/t/v3/w24-94/<code>.svg" width="100%" alt="demo">
```

리드미 본문 폭은 휴대폰에서 250px 남짓, 데스크톱에서 840px 남짓입니다. 이미지 하나를
양쪽에 맞춰 늘였다 줄였다 하면 14px 글자가 휴대폰에서 6px이 되고, 그냥 두면 옆으로
잘려나갑니다. 그래서 데모가 스스로 다시 접힙니다. 글은 한 벌만 싣고, SVG 안의 CSS가
이미지가 실제로 그려진 상자에서 줄바꿈 폭을 계산합니다. 주소의 두 숫자가 그 범위입니다.
덕분에 글자는 어디서나 쓴 그대로의 크기로 남고, 줄은 오른쪽 패딩에 닿는 곳에서 접히며,
`<picture>`도 두 번째 주소도 필요 없습니다.

`width="100%"`는 장식이 아닙니다. 빼면 이미지가 300px로 주저앉습니다.

에디터의 **GitHub용 복사**는 저 한 줄을 뷰포트 구간별 변형을 담은 `<picture>`로 감쌉니다.
`<img>` 상자는 남는 높이를 돌려줄 수 없어서 한 줄짜리는 항상 가장 좁은 폭의 높이를
예약하는데, picture는 예약량을 화면 크기에 맞춰 골라서 데스크톱이 휴대폰 값을 치르지
않게 합니다. 어떤 변형이든 스스로 다시 접히므로, 구간 예측이 빗나가도 빈 줄 몇 개가
남을 뿐 글자는 잘리지 않습니다. 블록은 대본이 필요로 하는 만큼만 길어집니다. 예약
높이가 같은 구간은 하나로 합쳐지고, 접히는 줄이 없는 대본은 그대로 한 줄입니다.

또는 **SVG 다운로드**로 받아 레포에 커밋하세요. 그러면 이 서비스와 무관하게 동작합니다.

```bash
git clone https://github.com/bbjbc/termcast
cd termcast
pnpm install
pnpm dev        # http://localhost:3210
```

## 대본 쓰기

```
title  mytool
prompt ❯
speed  55ms

type  npm i -g mytool
wait  500ms
ok    ✓ 패키지 1개 설치, 1.2초
out
type  mytool init
ok    ✓ mytool.config.ts 생성
dim   → 다음: mytool build
type
```

### 내용

| 명령 | 하는 일 |
| --- | --- |
| `type <텍스트>` | 프롬프트 뒤에 한 글자씩 타이핑 |
| `out <텍스트>` | 한 줄 즉시 출력 |
| `dim <텍스트>` | 흐리게 출력 |
| `ok <텍스트>` | 초록 |
| `err <텍스트>` | 빨강 |
| `warn <텍스트>` | 노랑 |
| `out` | 빈 줄 |
| `wait 500ms` | 정지 |
| `type` | 프롬프트만, 커서 깜빡임 |

### 설정

| 지시어 | 기본값 | 하는 일 |
| --- | --- | --- |
| `title` | 없음 | 창 제목, 비우면 표시하지 않음 |
| `prompt` | `$` | 프롬프트 문자열 |
| `speed` | `55ms` | 글자당 타이핑 간격 |
| `hold` | `1.5s` | 마지막 줄 뒤 멈춤 |
| `theme` | `dark` | `dark` · `light` · `auto` |
| `chrome` | `mac` | `mac` · `plain` · `none` |
| `font` | `14` | 글자 크기(px) |
| `cols` | `0` | 가로 폭(글자 수), 20에서 200까지, 0이면 내용에 맞춤 |
| `rows` | `0` | 최소 세로 높이(줄 수), 0이면 내용에 맞춤 |
| `radius` | `9` | 모서리 반경(px) |
| `loop` | `on` | `on` · `off` |
| `color <키> <색>` | 없음 | `bg bar bd dot ti fg dim ok err warn` |

알아두면 좋은 것 몇 가지:

- **프롬프트는 타이핑되지 않습니다.** 줄이 시작될 때 이미 거기 있습니다. 실제 터미널이 그렇듯이.
- **`speed`와 `prompt`는 대본 중간에 다시 쓰면** 그 지점부터 적용됩니다. 설치는 느긋하게,
  빌드 로그는 빠르게 흘릴 수 있습니다.
- **`cols`와 `rows`는 터미널을 재는 방식 그대로** 글자 수와 줄 수로 창 크기를 정합니다.
  `cols 80`에 `rows 24`면 우리가 아는 그 크기고요. `rows`는 상한이 아니라 하한입니다.
  정적 SVG는 스크롤이 안 되니, 출력이 길면 줄을 잃는 대신 창이 늘어납니다. 반대로 `cols`는
  상한이라, 폭을 넘는 줄은 터미널이 그러듯 글자 단위로 다음 줄에 이어집니다. `cols 0`이면
  창이 내용에 맞춰 늘어나므로 줄바꿈은 일어나지 않습니다.
- **앞 공백을 살리려면 따옴표로:** `out "    nested.txt"`

### 한글

한글·한자·가나·전각기호·이모지는 터미널에서 두 칸을 차지합니다. termcast는 그 폭을 계산해
글자를 셀 격자에 올리므로, 눌리지도 않고 뒷부분을 밀어내지도 않습니다. 조각마다
`textLength`를 명시하기 때문에 보는 쪽 폰트가 무엇이든 칸이 유지됩니다.

## 어떻게 동작하나

**GitHub에서 애니메이션이 사는 이유**는 GitHub이 레포의 SVG에 붙이는 헤더 때문입니다.

```
Content-Type: image/svg+xml
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

`style-src 'unsafe-inline'`이 열려 있어서 인라인 `<style>` 블록이 살아 있고 CSS 키프레임이
재생됩니다. 스크립트는 `sandbox`가 막으므로, termcast는 선언적 애니메이션만 내보냅니다.

폰트도 같은 헤더의 결과입니다. 외부 폰트를 못 불러오니 SVG 안의 웹폰트 링크는 무시되고
시스템 모노스페이스로 떨어집니다.

**링크에 데이터베이스가 필요 없습니다.** 대본은 deflate로 압축해 base64url로 경로에 싣습니다.
`/t/v3/<code>.svg`가 그 자리에서 렌더하고, 입력이 같으면 출력이 같으므로 응답은 immutable로
캐시됩니다. 긴 대본은 URL 한도를 넘는데, 그때는 에디터가 다운로드를 권합니다.

`v3`는 렌더러 버전입니다. 응답이 1년간 immutable이라, 이미 붙여넣은 주소는 처음 받은 그림을
그대로 유지합니다. 렌더러를 개선하면 버전이 올라가고 그건 새 주소이므로, 이미 공개된 것이
모르는 사이에 바뀌지 않습니다.

`w24-94`는 이미지가 다시 접히는 열 범위입니다. 주소에 들어가는 이유도 같습니다. 데모
자체의 성질이 아니라 데모가 어디에 놓이느냐의 성질이니까요. 폭 없이 `/t/v3/<code>.svg`로
부르면 예전처럼 고정 폭 그림이 나옵니다.

**녹화하지 않습니다.** 세션을 캡처하는 게 아니라 쓰는 겁니다. 오타도, 어색한 대기도, 깨끗한
화면을 얻으려고 명령을 다시 실행할 일도 없습니다. 아직 만들지 않은 옵션도 데모할 수 있고요.
그 대가는 정직성입니다. 대본은 어떤 출력이든 주장할 수 있습니다. 데모 속 숫자가 중요한
것이라면, 그걸 진짜 숫자로 만드는 건 쓰는 사람 몫입니다.

## 구조

```
src/app/            라우트: 에디터 페이지와 /t/[...seg]
src/components/     ui/ 프리미티브, 그 위에 tape · output · workbench
src/hooks/          대본 상태, URL 인코딩, 클립보드
src/lib/            파서, 렌더러, 하이라이터, 인코더. 전부 순수 함수
```

`src/lib`에는 React도 DOM도 없습니다. 그래서 브라우저 미리보기와 서버 라우트가 같은 코드를
호출할 수 있습니다.

대본 문자열이 유일한 상태입니다. 설정 패널은 자기 값을 들고 있지 않고 대본에 지시어를
씁니다. 그래서 화면과 글이 어긋날 수 없고, 대본을 주소에 실으면 전부 딸려갑니다.

런타임 의존성은 Next.js와 React뿐입니다. 압축은 `CompressionStream`을 쓰므로 압축
라이브러리도 없습니다.

```bash
pnpm dev        # http://localhost:3210
pnpm build
pnpm lint
pnpm test
pnpm coverage   # 같은 실행에 100% 게이트
```

테스트는 로직을 덮습니다. 파서, 렌더러, 폭 계산, 인코더, SVG 라우트, 로케일 리다이렉트.
브라우저가 필요 없는 것들이라 node에서 그냥 돕니다. 컴포넌트는 브라우저 확인에 맡깁니다.
마크업 모양을 검사하는 테스트는 레이아웃을 고칠 때마다 깨지면서 정작 잡는 게 없어서입니다.

## 언어

사이트는 `/en`과 `/ko`로 나뉘고, 맨 위 상태줄에서 바꿀 수 있습니다. 언어를 바꿔도 쓰던
대본은 주소에 실려 그대로 넘어옵니다.

대본 문법 오류 메시지는 영어입니다. 명령 이름 자체가 영어라 그대로 두었습니다.

## 라이선스

[MIT](LICENSE) © bbjbc
