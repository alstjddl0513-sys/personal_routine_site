# Rally — 개인 취준 트래커

취준 기간에 채용 리스트·루틴·운동·기술 블로그·CS 학습을 한 곳에서 관리하는 웹앱.
MVP는 1인 전용으로 시작했으나 Phase 12에서 Supabase Auth로 다인화 인프라를 얹었다. 상세 기획은 `docs/개인_루틴_커리어_관리_웹사이트_기획서.pdf`.

## 주요 기능

- **채용 리스트** (`/jobs`) — 회사 · 유형/규모/우선순위 · 지원 상태 · 마감일 · 상시채용 뱃지 · 인라인 편집, 하트/즐겨찾기, `/jobs/statistics`(파이프라인, pass rate, D-7 임박, 놓친 공고), `/jobs/report` 취업활동 인쇄(A4 landscape)
- **루틴 트래커** (`/routines`) — 시간블록 × 주간 체크표, 이번주 회고, 주간 네비게이션, `/routines/calendar` 월간 뷰 + 스트릭 뱃지
- **운동 기록** (`/workouts`) — 세션/세트 단위 기록(kg×reps·RIR), 지난번 기록·PR 인라인 비교, 상체/하체 필터 탭, 부위별 주간 세트 목표 달성률(`muscle_goals`), 세션 여러 개(분할 훈련), 휴식 타이머, `/workouts/statistics` 무게 진행도·주간 잔디·주간 스트릭
- **기술 블로그** (`/blog`) — 카카오/토스/우아한 등 8개 소스 RSS 자동 수집(내부 `@nestjs/schedule` 크론), 소스 필터, 수동 새로고침
- **CS 학습** (`/learn`) — 100+ 큐레이션 질문 하루 5문제 + 복습 모드(오래된 순), 카테고리 필터, `TipBlock` 꼬리 질문, `/learn/statistics` 잔디·KPI, 커스텀 질문 CRUD
- **문서 관리** (`/settings/documents`) — 이력서·포트폴리오 PDF 업로드(Supabase Storage, private 버킷, 2단계 signed URL) + 외부 링크 병용, 대표 문서 라디오
- **알림** — 브라우저 Notification API 기반. 채용 마감 D-1/D-3, 아침 요약(오늘 마감 + 미체크 루틴), 저녁 루틴 리마인더, 운동 스킵 리마인더. 알림 로그 드로어 + 통합 설정 모달 + 마스터 on/off. 서버 sync는 `profiles.preferences` JSONB
- **어드민** (`/admin`, env `ADMIN_USER_IDS` 게이트) — 사용자 목록/차단(Supabase `ban_duration`)/강제 탈퇴, 공지 인박스 CRUD(활성 기간·타겟·kind)
- **설정** (`/settings`) — 다크모드, JSON 백업, 닉네임/계정 탈퇴, 알림 통합, 기업 유형/시간블록/운동 종목/블로그 소스/CS 카테고리/질문/부위 목표 커스터마이징

## 스택

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (`apps/web`)
- **Backend**: NestJS 11 + Drizzle ORM 0.45 (`apps/api`)
- **DB**: Supabase (매니지드 PostgreSQL, Session Pooler)
- **Auth**: Supabase Auth (JWKS/ES256, jose로 서버 검증) + Google OAuth (PKCE)
- **Storage**: Supabase Storage (`documents` private 버킷)
- **Monorepo**: pnpm workspaces (`pnpm -r --parallel`)
- **Deploy**: Vercel (web) + Render (api) + Supabase (db) + cronjob.org (스케줄러). 절차는 `docs/deployment.md`

## 폴더 구조

```
apps/
  web/       Next.js 앱 (localhost:3000)
  api/       NestJS 앱 (localhost:3001)
packages/
  shared/    web/api 공용 타입
docs/        기획 · 배포 · 아키텍처 · 삽질 로그
```

## 개발 환경 준비

요구 버전: **Node.js 22.11.0+**, pnpm 11.

> Node 20은 의존 트리 중 `node:sqlite`(Node 22.5+ 요구) 패키지에 걸려 실패.

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경 변수
cp .env.example .env
# .env 열어서 DATABASE_URL, SUPABASE_URL 등 채우기
# (Supabase 대시보드 → Project Settings → Database → Session Pooler)
```

## 실행

```bash
# web(3000) + api(3001) 동시 기동
pnpm dev

# 개별 기동
pnpm --filter web dev
pnpm --filter api dev
```

## 자주 쓰는 스크립트

```bash
pnpm build                          # 전체 빌드
pnpm lint                           # 전체 lint
pnpm typecheck                      # 전체 타입 체크

# DB (Drizzle)
pnpm --filter api db:generate       # 스키마 변경 → 마이그레이션 SQL 생성
pnpm --filter api db:migrate        # 생성된 SQL 적용 (승인 후 수동 실행)
pnpm --filter api db:studio         # Drizzle Studio (브라우저 GUI)

# 시드 (전용 스크립트로 분리, 이름 기준 upsert-if-missing)
pnpm --filter api db:seed           # 최초 세팅용 (companies 대량 삽입 — 재실행 시 wipe 주의)
pnpm --filter api db:seed:exercises # 운동 종목 upsert
pnpm --filter api db:seed:blog-sources # 블로그 RSS 소스 upsert
pnpm --filter api db:seed:questions    # CS 질문 upsert
```

## 배포

Render(API) + Vercel(Web) + Supabase(DB) + cronjob.org(스케줄러) 조합. 단계별 절차와 env 세팅은 `docs/deployment.md`.

## 문서

- `CLAUDE.md` — 작업 규칙 (계획 우선, 스코프 좁게, DB 손 X 등)
- `docs/todo.md` — 로드맵 · 진행 상황 (로컬 파일)
- `docs/architecture.md` — 3층 배포 아키텍처 + 스택 선택 이유
- `docs/deployment.md` — 배포 절차 · Google OAuth · 스케줄러 · 릴리스 절차
- `docs/troubleshooting.md` — 삽질 로그
- `docs/supabase-usage.md` — Supabase 세팅
