# 디자인 레퍼런스

스크린샷은 `./references/`에, 각 항목은 아래 형식으로 추가.

## 시안

디자인 툴에서 뽑은 정적 HTML — 브라우저로 바로 열어 비교. 인라인 style이라 **레이아웃·색·타이포만 참고**하고 마크업을 그대로 옮기지 않는다(토큰은 `globals.css --rally-*`).

| 파일 | 내용 | 구현 |
|--|--|--|
| `rally-dashboard.html` | '오늘' 대시보드 + 사이드바 라이트 | `/today`, `Sidebar.tsx` |
| `rally-dashboard-dark.html` | 같은 화면 다크 | `globals.css` `.dark`의 `--rally-*` |

**현재 상태**: 숲색 `#1F3D30` · 메리골드 `#E9B949`(로고·챌린지 포인트, 시안의 황토 `#C8963E`에서 변경) · 바탕 `#F6F7F5`, IBM Plex Sans KR + Noto Serif KR(인사말). 사이드바(전 페이지)와 `/today`에 적용. 다른 페이지 본문은 zinc — 페이지별로 개편할 때 같은 토큰으로 확산. 모바일(BottomNav)은 별도 시안 예정. 시안의 학습 '답 보기'는 구현에서 ‹ › 미리보기 + '답 보러 가기'(`/learn?q=`)로 바꿈.

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
