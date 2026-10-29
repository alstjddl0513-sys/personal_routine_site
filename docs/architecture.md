# 아키텍처

> **언제 보나**: 요청이 어디를 거쳐 어디에 저장되는지, 왜 이 스택을 골랐는지 알고 싶을 때.
> 로컬 dev는 아래 그림에서 Vercel·Render 자리를 `pnpm dev`(web 3000 · api 3001)가 대신하고 Supabase만 그대로 쓴다.

**목차**
- [3층 구조](#3층-구조)
- [요청 흐름](#요청-흐름)
- [층별 역할과 장애 영향](#층별-역할과-장애-영향)
- [Supabase에서 쓰는 것](#supabase에서-쓰는-것)
- [기술 선택 이유](#기술-선택-이유)

---

## 3층 구조

```
[브라우저]
    │  HTTPS + Supabase Auth 세션 쿠키
    ▼
┌──────────────────────────────────────────────┐
│  Vercel  ─  apps/web (Next.js 16)            │
│  · SSR 페이지 렌더                            │
│  · proxy.ts: 세션 refresh + 페이지 가드       │
│  · /api/proxy/*: 브라우저 요청을 받아          │
│    Authorization: Bearer <JWT> 붙여 Render로  │
└──────────────────────────────────────────────┘
    │  서버-서버 fetch (Bearer <supabase JWT>)
    ▼
┌──────────────────────────────────────────────┐
│  Render  ─  apps/api (NestJS + Drizzle)      │
│  · DTO 검증 · 도메인 로직                     │
│  · SupabaseAuthGuard (JWKS/ES256, jose)      │
│  · AdminGuard (env ADMIN_USER_IDS)           │
└──────────────────────────────────────────────┘
    │  PostgreSQL + SSL (Session Pooler 5432)
    ▼
┌──────────────────────────────────────────────┐
│  Supabase  ─  Postgres · Auth · Storage      │
│  · Postgres: 도메인 데이터 + RLS              │
│  · Auth: JWKS 발급, Google OAuth             │
│  · Storage: documents 버킷 (private)         │
└──────────────────────────────────────────────┘
```

**Vercel은 DB에 직접 붙지 않는다.** 모든 DB 접근은 Render를 거친다.
- Vercel env에는 `DATABASE_URL`이 없다 (Render에만 있음)
- Render는 계속 떠 있는 컨테이너라 Session Pooler(5432)로 충분 — 서버리스용 Transaction Pooler(6543)는 안 씀
- 프론트에서 DB를 직접 못 만지는 구조 자체가 권한 분리

## 요청 흐름

예: `/jobs`에서 회사 추가

1. 브라우저 → `POST /api/proxy/companies` (same-origin, 토큰 없음)
2. Vercel: `proxy.ts`가 세션 쿠키 refresh → `/api/proxy/[...path]`가 서버에서 access token을 꺼내 `Authorization: Bearer` 첨부 → Render로 전달
3. Render: `SupabaseAuthGuard`가 JWT 검증 → `req.user.id` → controller → Drizzle → INSERT (`owner_id`로 소유자 한정)
4. 같은 길로 응답

DevTools에서 브라우저 → `/api/proxy/*` 요청에 `Authorization` 헤더가 **없어야 정상**. 브라우저에 노출되는 키는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`뿐이고, RLS가 최종 방어선.

## 층별 역할과 장애 영향

| 층 | 담당 | 죽으면 | 데이터 |
|--|--|--|--|
| Vercel | 렌더 · 프록시 | 사이트 접속 불가 | 저장 안 함 → 손실 없음 |
| Render | 검증 · 비즈니스 로직 | 화면은 뜨지만 API 5xx | stateless → 손실 없음 |
| Supabase | 저장 | 전체 500 | **유일한 저장소** — 무료 티어 7일 미접속 시 자동 pause 주의 |

Render(15분 idle 슬립)와 Vercel(요청마다 다른 인스턴스) 모두 로컬 저장이 불가능해서, 항상 떠 있는 Supabase가 유일한 데이터 보관 장소다.

## Supabase에서 쓰는 것

| 기능 | 용도 |
|--|--|
| Postgres | 유일한 영속 계층 (Drizzle + postgres.js) |
| Auth | 이메일·비번 + Google OAuth, JWKS/ES256 |
| RLS | 유저별 데이터 격리. `owner_id` 테이블마다 select/insert/update/delete 4정책 — 실제 상태 확인 SQL은 [`supabase-usage.md`](./supabase-usage.md#rls) |
| Storage | `documents` private 버킷 (이력서·포폴 PDF) |

안 쓰는 것과 붙일 시점: Realtime(실시간 공유 생길 때) · Edge Functions(현재는 Render가 대신) · Custom SMTP(비번 재설정 메일이 필요해질 때 — built-in SMTP는 사실상 못 씀).

---

## 기술 선택 이유

> 새 라이브러리·서비스를 들이거나 스택을 크게 바꿀 때 여기에 **채택 · 대안 · 이유**를 한 줄씩 남긴다 (CLAUDE.md 12번).

### 인프라
- **Vercel Hobby** (대안: Netlify, Cloudflare Pages) — Next.js 제작사라 세팅이 거의 없고 프리뷰 URL 무료
- **Vercel 리전 `icn1`** (대안: 기본 `iad1`, `hnd1`) — 사용자·Render(싱가포르)·Supabase(서울)가 전부 아시아라 `iad1`이면 SSR이 태평양을 두 번 건넘(~400ms). `apps/web/vercel.json`에 고정
- **Render Free** (대안: Railway, Fly.io) — 무료 상시 서비스 + GitHub 자동 배포. 15분 슬립은 cron 핑으로 완화
- **cronjob.org** (대안: GitHub Actions, UptimeRobot) — 무료, UI 단순. 5분마다 `/health/ping`. Actions는 무료 분 소진이 아까움
- **Supabase** (대안: Neon, PlanetScale, Railway Postgres) — 무료 500MB, Session Pooler로 IPv4, 나중에 Auth·Storage를 코드 갈아엎지 않고 얹을 수 있음
- **브랜치 feat → develop → main** (대안: trunk-based, 정식 GitFlow) — main = 배포 지점, develop = 통합. 1인이라 GitFlow는 과함

### 앱
- **Next.js 16 App Router** (대안: Remix, Vite+React) — SSR·Route Handler를 한 프레임워크에서, 채용 시장 수요도 높음
- **NestJS** (대안: Express·Fastify 직접 구성) — 모듈·컨트롤러·DTO 구조가 규칙을 강제, class-validator로 검증 표준화. 도메인 추가를 skill로 반복 자동화
- **Drizzle** (대안: Prisma, TypeORM) — 스키마에서 타입 추론, SQL에 가까운 쿼리, 파일 기반 마이그라 리뷰 쉬움. Prisma는 별도 엔진 프로세스가 배포 부담
- **Supabase Auth** (대안: NextAuth, Auth0·Clerk) — DB가 이미 Supabase라 `auth.users` FK + RLS를 한 곳에서. NextAuth는 세션·provider를 직접 만들어야 하고, Auth0·Clerk는 이 규모엔 과하고 종속이 큼
- **jose** (대안: jsonwebtoken + jwks-rsa) — JWKS(ES256) 공개키 fetch·캐시·회전을 `createRemoteJWKSet` 하나로. 의존성 0, async·TS 우선
- **@nestjs/throttler** (대안: 직접 구현, Redis 기반) — 데코레이터로 엔드포인트별 제한. 인메모리라 재시작 시 초기화되지만 스크레이핑 방지엔 충분
- (폐기) **자체 폼 + Basic Auth 쿠키** — 1인 MVP 시절 임시. Phase 12에서 Supabase Auth로 완전 대체

### 도구
- **pnpm 11 workspace** (대안: npm·Yarn workspace, turbo) — `workspace:*` 안정, 디스크 절약. turbo는 앱 2개 규모엔 이득보다 세팅 부담(Windows에서 실행 차단 이슈도 있었음). PowerShell 실행 정책은 `pnpm.cmd`로 우회

### UI
- **@dnd-kit** (대안: react-beautiful-dnd(보관됨), react-dnd, HTML5 DnD) — React 19 호환, 포인터·터치·키보드 지원, headless라 Tailwind 그대로. 시간블록 드래그 재정렬
- **Bricolage Grotesque + IBM Plex Sans KR** via `next/font` (대안: Pretendard, Google Fonts `<link>`) — 숫자가 잘 읽히는 디스플레이 서체 + 한글 본문용. `next/font`는 셀프호스팅 + CLS 방지, 새 npm 의존성 없음. Plex KR은 한글 서브셋이 커서 `preload: false`
- **디자인 토큰 `globals.css --rally-*` → `@theme inline`** (대안: Tailwind 기본 팔레트, CSS-in-JS) — 라이트·다크를 변수 교체로 처리. **현재 `/today`에만 시험 적용**, 앱 전체 디자인 개편 때 재검토
