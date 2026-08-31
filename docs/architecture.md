# 배포 아키텍처

프로덕션 구성. 로컬 dev는 이 그림에서 Vercel/Render를 `pnpm dev`로 대체하고 Supabase만 그대로 씀.

## 3층 구조

```
[브라우저]
    │
    │  HTTPS + Basic Auth (BASIC_AUTH_USER/PASSWORD)
    ▼
┌──────────────────────────────────────────────┐
│  Vercel  ─  apps/web (Next.js 16)            │
│                                              │
│  · SSR/SSG 페이지 렌더                        │
│  · /api/proxy/* route handler                │
│    (클라이언트 mutation을 same-origin으로 받아  │
│     서버측에서 X-Auth-Token 첨부 후 Render로) │
└──────────────────────────────────────────────┘
    │
    │  서버-서버 fetch (X-Auth-Token 헤더, 브라우저에 노출 X)
    ▼
┌──────────────────────────────────────────────┐
│  Render  ─  apps/api (NestJS + Drizzle)      │
│                                              │
│  · HTTP endpoint, DTO 검증, 도메인 로직        │
│  · AccessTokenGuard로 X-Auth-Token 검증       │
│  · Drizzle ORM → postgres.js 드라이버         │
└──────────────────────────────────────────────┘
    │
    │  PostgreSQL wire protocol + SSL (Session Pooler 5432)
    ▼
┌──────────────────────────────────────────────┐
│  Supabase  ─  Managed PostgreSQL             │
│                                              │
│  · 유일한 영속 계층 (모든 데이터가 여기 저장)    │
│  · Session Pooler 게이트웨이 (IPv4)           │
└──────────────────────────────────────────────┘
```

## 각 층의 역할

| 층 | 담당 | 죽으면 | 재시작 시 |
|---|---|---|---|
| Vercel | 프론트 렌더, 프록시 | 사이트 접속 불가 (Render는 살아있음) | 데이터 손실 없음 (원래 저장 안 함) |
| Render | 비즈니스 로직, 검증 | Vercel 로딩되지만 API 호출 5xx | 데이터 손실 없음 (stateless) |
| Supabase | 데이터 저장소 | 전체 사이트 500 | **여기 죽으면 데이터 소실** — 무료 티어 자동 pause 주의 |

## 왜 셋이 다 필요한가

- **Render는 stateless.** 무료 티어 15분 idle 시 컨테이너 슬립 → 새 컨테이너로 부팅. 로컬 저장 불가.
- **Vercel도 서버리스.** 요청마다 다른 함수 인스턴스. 서버 파일 시스템 저장 불가.
- 따라서 항상 살아있는 **외부 DB(Supabase)** 가 유일한 데이터 보관 장소.

## 트래픽 흐름 (mutation 예시: /jobs에서 회사 추가)

1. 브라우저: 폼 submit → `POST /api/proxy/companies` (same-origin, `X-Auth-Token` 없음)
2. Vercel 서버측: `apps/web/src/proxy.ts`가 요청 받음 → Basic Auth 통과 확인 → `X-Auth-Token: <API_ACCESS_TOKEN>` 헤더 첨부 → Render로 프록시
3. Render: `AccessTokenGuard`가 헤더 검증 → NestJS controller → Drizzle → Supabase INSERT
4. 응답 역경로로 브라우저에 반환

**중요**: `X-Auth-Token`은 서버측에서만 만들어짐. 브라우저 DevTools Network 탭엔 노출되지 않음. `API_ACCESS_TOKEN`은 `NEXT_PUBLIC_` 접두어 없이 Vercel Env에만 있음.

## Vercel은 Supabase에 직접 연결하지 않음

이 아키텍처에서 **Vercel은 DB를 몰라도 됨**. 모든 DB 접근은 Render를 경유. 그래서:

- Vercel Env에 `DATABASE_URL` 없음 (Render Env에만 있음)
- Vercel이 Serverless여도 Transaction Pooler(6543) 신경 쓸 필요 없음. Render는 long-running 컨테이너라 Session Pooler(5432)로 충분
- 프론트에서 DB 쿼리 직접 못 하는 게 오히려 안전 (권한 분리)

## 현재 안 쓰는 Supabase 기능

MVP는 순수 Postgres 호스팅으로만 사용. 나중에 다인 서비스로 확장 시 추가 가능:

| 기능 | 언제 붙일까 |
|---|---|
| Auth (소셜 로그인) | 다인 서비스 전환 시. Basic Auth 대체 |
| Storage (파일 업로드) | 이력서/포트폴리오 첨부 기능 생기면 |
| Realtime | 실시간 협업/알림 붙일 때 |
| Row Level Security | 유저별 데이터 격리 필요할 때 (Auth와 세트) |

## 선택 이유 (Stack decisions)

새 스택을 도입하거나 중요한 업데이트를 할 때마다 이 표에 한두 줄로 이유를 남긴다 (CLAUDE.md 14). 대안 후보와 채택 근거를 함께 적어두면 미래에 재검토할 때 편함.

| 층/도구 | 채택 | 대안 후보 | 채택 이유 |
|---|---|---|---|
| 프론트 | **Next.js 16 (App Router)** | Remix, Vite+React | SSR·SSG·Route Handler를 한 프레임워크에서. Vercel 무료 티어와 궁합 최상. 채용에서 요구 빈도 높음(취준 프로젝트 목적 부합) |
| 백엔드 | **NestJS** | Express+수제, Fastify+수제 | 데코레이터 기반 모듈/컨트롤러/DTO 구조가 처음부터 규칙 강제. 검증(class-validator) 표준화. 여러 도메인 추가 시 skill로 반복 자동화 가능 |
| ORM | **Drizzle** | Prisma, TypeORM | 스키마-타입 자동 추론, SQL에 가까운 빌더, migration이 파일 기반이라 리뷰 쉬움. Prisma는 별도 프로세스 필요해서 배포 오버헤드 |
| DB 호스팅 | **Supabase** (Postgres) | Neon, PlanetScale, Railway Postgres | 무료 티어 넉넉(500MB), Session Pooler로 IPv4 지원, 미래 확장 시 Auth/Storage/Realtime을 코드 갈아엎지 않고 얹을 수 있음 |
| API 호스팅 | **Render** (Free) | Railway, Fly.io | 무료로 상시 서비스, GitHub 연동 자동 배포 단순. 무료 티어의 15분 슬립은 cron 핑으로 완화 |
| Web 호스팅 | **Vercel** (Hobby) | Netlify, Cloudflare Pages | Next.js 만든 곳 → 세팅 0, 빌드 자동, preview URL 무료. 상업적 사용 금지는 개인 MVP엔 무관 |
| 콜드 스타트 완화 | **cronjob.org** | GitHub Actions, UptimeRobot | UI 간단, 완전 무료, 10분 주기로 `/health` 핑. GH Actions는 무료 분 소진 아까움 |
| 모노레포 | **pnpm workspace** | npm workspace, Yarn, turbo | 심볼릭 링크 방식이 디스크 절약, `workspace:*` 프로토콜 안정. turbo는 앱 2개 규모엔 캐시 이득보다 세팅 부담 |
| 패키지 매니저 | **pnpm 11** | npm, yarn | 위와 동일 이유. Windows에서 `.ps1` 실행 정책 이슈는 `pnpm.cmd`로 우회(troubleshooting.md) |
| 인증 (MVP) | **자체 폼 + HttpOnly 쿠키** | Supabase Auth, NextAuth | 1인 전용이라 계정 시스템 오버킬. env 두 개(`BASIC_AUTH_USER/PASSWORD`)만으로 관리. 다인 확장 시 Supabase Auth로 이관 예정 |
| 배포 브랜치 전략 | **feat → develop → main** | trunk-based, GitFlow full | main은 배포 지점(자동 재배포), develop은 통합 줄기. 1인이라 무거운 GitFlow는 과함 |

## 관련 문서

- `docs/deployment.md` — 실제 배포 단계별 절차
- `docs/supabase-usage.md` — Supabase 단독 사용법 (연결 문자열 종류, Drizzle 흐름)
- `docs/troubleshooting.md` — 배포/개발 중 만난 실제 문제와 해결
