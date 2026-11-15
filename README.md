# Rally — 취준 루틴·커리어 트래커

취업 준비 기간의 **채용 지원 · 일정 · 루틴 · 운동 · CS 학습 · 기술 블로그**를 한 곳에서 관리하는 웹앱.
1인용 MVP로 시작해 Supabase Auth로 다인화했다. 기획서: `docs/개인_루틴_커리어_관리_웹사이트_기획서.pdf`

**바로가기**: [기능](#기능) · [빠른 시작](#빠른-시작) · [자주 쓰는 명령](#자주-쓰는-명령) · [문서 지도](#문서-지도)

---

## 기능

| 화면 | 하는 일 |
|--|--|
| **오늘** `/today` | 로그인 후 첫 화면. 오늘 마감·일정·미체크 루틴 요약, 오늘의 CS 5문제, 2주 내 일정 + 오늘 메모, 루틴 체크, 이번 주 운동, 채용 현황, 새 기술 블로그 글 |
| **캘린더** `/calendar` | 월 그리드 + 날짜 패널. 채용 일정(마감·시험·면접·발표)과 날짜 메모 |
| **채용** `/jobs` | 회사 표(유형·우선순위·지원상태·마감·일정·공고 링크·제출본·메모 인라인 편집), `/jobs/statistics` 파이프라인·통과율·임박·놓친 공고, `/jobs/report` 인쇄 |
| **루틴** `/routines` | 시간블록 × 주간 체크표, D-day 챌린지, 주간 회고, `/routines/statistics` |
| **운동** `/workouts` | 세션·세트 기록(kg×reps·RIR), 지난 기록·PR 비교, 휴식 타이머, 부위별 주간 목표, `/workouts/statistics` |
| **학습** `/learn` | CS 질문 하루 5문제 + 꼬리 질문, 복습·즐겨찾기, 카테고리, 커스텀 질문, `/learn/statistics` |
| **블로그** `/blog` | 기술 블로그 7곳 RSS 자동 수집(하루 2회) + 수동 새로고침 |
| **설정** `/settings` | 다크 모드, 알림, 이력서·포폴 문서(PDF·링크, 회사별 제출 기록), 각종 목록 커스터마이징, 백업, 계정 |
| **어드민** `/admin` | 사용자 관리·차단, 공지, 피드백 (`ADMIN_USER_IDS`만) |

- **알림**: 브라우저 알림(마감 D-3/D-1, 일정 D-3/D-1/당일, 아침 요약, 저녁 루틴, 운동 스킵, 챌린지 완주) + 종 아이콘 드로어(종류별 필터). 앱이 열려 있을 때 발송
- **모바일**: 반응형 + PWA. 하단 탭 오늘·채용·루틴·운동·학습 + 더보기(캘린더·블로그·설정)

## 스택

| 영역 | 사용 |
|--|--|
| Web | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 — `apps/web` |
| API | NestJS 11 · Drizzle ORM — `apps/api` |
| DB · 인증 · 파일 | Supabase (Postgres · Auth + Google OAuth · Storage) |
| 공용 타입 | `packages/shared` (`@repo/shared`) |
| 배포 | Vercel (web) · Render (api) · Supabase (db) · cronjob.org — 전부 무료 티어 |

선택 이유는 [`docs/architecture.md`](docs/architecture.md#기술-선택-이유).

```
apps/web        Next.js (localhost:3000)
apps/api        NestJS  (localhost:3001)
packages/shared web·api 공용 타입
docs/           문서 (아래 문서 지도)
```

## 빠른 시작

필요: **Node.js 22.11+** (20은 `node:sqlite` 때문에 실패) · pnpm 11

```bash
pnpm install
cp .env.example .env     # DATABASE_URL · Supabase 키 채우기 → docs/supabase-usage.md
pnpm --filter api db:migrate
pnpm dev                 # web 3000 + api 3001 동시 실행
```

Windows PowerShell에서 `pnpm`이 실행 정책에 막히면 `pnpm.cmd`로.

## 자주 쓰는 명령

```bash
pnpm dev | build | lint | typecheck      # 전체 (pnpm -r)
pnpm --filter web dev                     # 하나만 실행

pnpm --filter api db:generate             # 스키마 변경 → 마이그 SQL 생성 (리뷰 후)
pnpm --filter api db:migrate              # 마이그 적용 (로컬 DB)
pnpm --filter api db:studio               # DB GUI

pnpm --filter api db:seed:exercises       # 운동 종목 추가분만 upsert
pnpm --filter api db:seed:blog-sources    # 블로그 소스 추가분만 upsert
pnpm --filter api db:seed                 # ⚠️ 최초 세팅 전용 — 재실행 시 회사 데이터를 지우고 다시 넣음
```

## 문서 지도

| 이럴 때 | 문서 |
|--|--|
| 작업 규칙 (계획 우선, 브랜치, 커밋) | [`CLAUDE.md`](CLAUDE.md) · API는 [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| 로컬 DB 연결·RLS·Supabase 사용법 | [`docs/supabase-usage.md`](docs/supabase-usage.md) |
| **배포하기** (develop → main, prod 마이그) | [`docs/release.md`](docs/release.md) |
| 서버 처음 세팅·env·스케줄러·OAuth | [`docs/deployment.md`](docs/deployment.md) |
| 구조와 기술 선택 이유 | [`docs/architecture.md`](docs/architecture.md) |
| 에러 해결 | [`docs/troubleshooting.md`](docs/troubleshooting.md) |
| 인증 설계 기록 (Phase 12) | [`docs/phase-12-auth.md`](docs/phase-12-auth.md) |
| 디자인 시안·레퍼런스 | [`docs/design/references.md`](docs/design/references.md) |
| 로드맵·진행 상황 | `docs/todo.md` (로컬 전용, git 제외) |
