# 디자인 레퍼런스

스크린샷은 `./references/`에, 각 항목은 아래 형식으로 추가.

## 시안 (`*.dc.html`)

디자인 툴에서 뽑은 시안. style 속성 안에 `{{ }}` 바인딩, `sc-for`/`sc-if` 태그가 섞여 있어 **레이아웃·색·타이포만 참고**하고 마크업을 그대로 옮기지 않는다. 확장자를 `.dc.html`로 두는 건 VS Code가 일반 HTML로 검사해 가짜 CSS 에러를 띄우지 않게 하기 위함(`.vscode/settings.json`에서 Handlebars로 연결, 로컬 설정).

| 파일 | 내용 | 구현 |
|--|--|--|
| `rally-dashboard-design.dc.html` | '오늘' 대시보드 라이트 | `/today` (PR #162) |
| `rally-dashboard-design-dark.dc.html` | 같은 화면 다크 | `globals.css` `.dark`의 `--rally-*` |

**현재 상태**: 코트 그린 `#17382B` · 라임 `#D9F45B` · 크림 `#F4F3EE`, Bricolage Grotesque + IBM Plex Sans KR은 `/today`에만 **시험 적용**. 앱 전체 디자인 개편 때 재검토(확정 아님) — 그때도 아래 레퍼런스 수집부터.

## 사용법

1. `references/` 폴더에 이미지 저장 (파일명: `NN-<서비스>-<특징>.png` 예: `01-notion-cream.png`)
2. 아래에 항목 추가 (좋은 점 · 훔칠 것 2줄)
3. Claude에게: "docs/design/references/ 분석해서 공통 패턴 뽑아줘"

## 참고 사이트

- **Mobbin** — mobbin.com (앱 스샷 카테고리별)
- **Dribbble** — dribbble.com (무드보드)
- **Godly** — godly.website (큐레이션 웹)
- **Pinterest** — "diary app UI", "productivity pastel", "cream ui" 검색
- 일상 앱 캡처 (Notion, Linear, Apple Health, 오늘의집 등)

## 항목

<!-- 예시:
### 01 - Notion Cream Mode
- 좋은 점: 크림 배경이 눈 편함, 여백 넉넉
- 훔칠 것: 정확한 크림 hex 스포이드
-->
