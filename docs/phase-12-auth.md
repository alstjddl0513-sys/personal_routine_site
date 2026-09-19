# Phase 12 — Auth (Supabase Auth 도입 + 다인화)

> 상태: 설계안 (2026-09-10 작성). 구현 진행 상황은 `docs/todo.md`로 동기화.

## 목표 / 비목표

### 목표

- Basic Auth 쿠키 세션 → Supabase Auth (이메일/비번 + Google OAuth)로 교체.
- 모든 도메인 테이블에 `owner_id uuid FK auth.users` 추가 + RLS 정책 적용.
- NestJS는 JWT 검증 후 `req.user.id`로 서비스 레이어에서 소유권 강제. RLS는 defense-in-depth.
- 기존 1인 데이터를 손실 없이 내 계정으로 귀속.

### 비목표 (이번 Phase 밖)

- 어드민 페이지 (`/admin`) — 별도 서브페이즈 12.5로 분리.
- GitHub OAuth — Google 먼저, GitHub는 나중.
- 실시간 세션 무효화, 2FA, magic link — MVP 밖.
- 팀/조직 개념 (multi-tenant 아닌 multi-user).

## 서브페이즈 로드맵

| # | 산출물 | 위험도 | 되돌리기 |
|---|---|---|---|
| **12.0** ✅ | 이 문서 | 낮음 | 파일 삭제 |
| **12.1** ✅ | `SupabaseAuthGuard` 스캐폴드 (등록 X, env 없으면 no-op), Supabase Console에서 email provider 확인 | 낮음 | 파일 삭제 |
| **12.2** ✅ | 프론트 `/login`·`/signup` Supabase Auth SDK로 교체 + **profiles 테이블(닉네임 uniqueness)** + `proxy.ts`를 Supabase 세션 검증으로 재작성 + Guard AppModule 등록 + Basic Auth 잔재 전면 제거 + **rate limit + prod env hard-fail** | 중 | 롤백 커밋 (아래 §안전장치) |
| 12.3 | Google OAuth provider 설정, `/auth/callback` 라우트, `/login`에 "Google로 로그인" 버튼 | 중 | 커밋 revert |
| 12.4 | `owner_id` 컬럼 마이그레이션 (모든 도메인 테이블, 자식 포함) + 기존 데이터 백필 + NOT NULL + RLS 정책 + 서비스 필터. **profiles 테이블도 이 시점에 RLS 함께 활성** | **높음** | DB 백업 → drop column (아래 §안전장치) |
| 12.4b | 계정 탈퇴 — `DELETE /profiles/me` (Supabase Admin API로 `auth.admin.deleteUser`) + `/settings`에 삭제 버튼. 12.4의 owner_id CASCADE 덕에 원샷 cascade 삭제. `SUPABASE_SECRET_KEY` env 필요 | 낮음 | 커밋 revert |
| **12.5** ✅ | 어드민 페이지 — 사용자 목록/차단/강제 탈퇴 + 공지 CRUD(인박스: 기간·타겟·kind). `AdminGuard`(env `ADMIN_USER_IDS`) + 어드민 자기계정 방어 + `announcements`/`announcement_targets`/`announcement_reads` 3테이블(마이그 `0022`). Supabase Auth `ban_duration` 활용. NotifBell 뱃지에 공지 미읽음 합산 · `NotifAuthSync`로 auth 이벤트 시 sink 재fetch + 계정 스코프. `/profiles/me`에 `isAdmin` 필드. 브랜치 `feat/phase-12/admin-page` | 중 | 커밋 revert (신규 테이블 3개만) |

## 현재 상태 요약 (2026-09-10 기준)

- **프론트 인증**: `apps/web/src/proxy.ts` (Next 16 middleware) — `BASIC_AUTH_USER/PASSWORD` 세팅 시 활성. `/login` 폼 → `/api/auth/login` POST → HMAC 쿠키(`auth-cookie.ts`). 미인증 API는 401 JSON, 미인증 페이지는 `/login?next=...`으로 리다이렉트.
- **백엔드 인증**: `AccessTokenGuard` (global, `APP_GUARD`) — `API_ACCESS_TOKEN` 세팅 시 `X-Auth-Token` 헤더 검증. `/health` 예외.
- **프록시 브릿지**: `/api/proxy/[...path]` (Next server) — 클라 fetch를 SSR 통해 API로 프록시하며 `X-Auth-Token` 서버측에서 첨부.
- **DB**: Supabase (로컬/prod 별도 프로젝트). Drizzle 마이그레이션 0000~0009. `auth.users` 존재하나 미사용.

## 인증 아키텍처

### 선택: 앱 레이어 보호 + RLS defense-in-depth

```
┌─────────┐         ┌──────────────────┐        ┌─────────────┐
│ Browser │ ──JWT──▶│ Next proxy       │──JWT──▶│ NestJS      │
│         │         │ (middleware +    │        │ SupabaseAuth│
│         │         │  /api/proxy)     │        │ Guard       │
└─────────┘         └──────────────────┘        │             │
                                                │ verify JWT  │
                                                │ → req.user  │
                                                └──────┬──────┘
                                                       │
                                          services filter by owner_id
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │ Postgres    │
                                                │ + RLS       │
                                                │ (defense    │
                                                │  in depth)  │
                                                └─────────────┘
```

- **NestJS**: 서비스 롤 키(또는 기존 DATABASE_URL — Supabase는 postgres user가 이미 RLS bypass임)로 DB 접근. Guard가 JWT verify 후 `req.user = { id, email }` 세팅. 서비스는 모든 쿼리에 `where owner_id = req.user.id` 조건.
- **Postgres**: 각 도메인 테이블에 RLS ENABLE. 정책은 `owner_id = auth.uid()` 기준. NestJS가 실수로 필터 누락해도 DB가 막아줌 (RLS를 bypass하려면 명시적 service_role JWT 필요).
- **Drizzle 관점**: RLS는 SQL 마이그레이션으로 관리. Drizzle 스키마 파일은 컬럼·FK만.

### JWT verify 방식

- Supabase Auth는 JWT를 발급. Next `@supabase/ssr` 로 발급·쿠키 관리, 프록시 통해 API 요청에 `Authorization: Bearer <access_token>` 헤더로 전달.
- **확정 (2026-09-10, Console 확인)**: 이 프로젝트는 이미 JWKS(ES256/ECC P-256)로 마이그레이션됨. Legacy HS256 shared secret은 "Previously used keys"에만 남아있고 새 토큰 발급엔 안 씀.
- NestJS Guard는 `jose`의 `createRemoteJWKSet`으로 `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`에서 공개키 fetch (자동 캐싱·회전 대응). shared secret env 불필요, `SUPABASE_URL`만 있으면 됨.

## DB 스키마 변경 (12.4)

### `owner_id` 컬럼 대상 (10개 테이블 전부)

**Top-level (7)**: `companies`, `company_types`, `time_blocks`, `day_notes`, `exercises`, `workout_sessions`, `blog_sources`
**Child (denormalize, 3)**: `routine_checks`, `workout_sets`, `blog_posts`

### 컬럼 정의

```sql
owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
```

- FK cascade: 계정 삭제 시 데이터 정리 (다인화 완료 후 시나리오).
- 초기 도입 시 nullable로 추가 → 백필 → NOT NULL. 자식 테이블은 INSERT/UPDATE 시 부모의 owner_id 복사 강제 (앱 레이어에서. DB trigger는 오버엔지니어링).

### 마이그레이션 순서 (12.4 세션 내)

1. `pnpm --filter api db:generate` 로 SQL 생성 — 모든 테이블에 nullable `owner_id` 추가.
2. **DB 백업 스냅샷** (Supabase Console → local/prod 각각 SQL export).
3. `auth.users`에 내 계정 생성 (12.2에서 이미 생성됨).
4. **백필 SQL** (마이그레이션에 포함 or 별도 스크립트):
   ```sql
   UPDATE companies       SET owner_id = '<my-uuid>' WHERE owner_id IS NULL;
   UPDATE company_types   SET owner_id = '<my-uuid>' WHERE owner_id IS NULL;
   -- ... 10개 테이블 전부
   ```
   `<my-uuid>`는 마이그레이션 파일에 하드코딩 X — 별도 `db:seed:owner` 스크립트로 env(`SEED_OWNER_ID`) 읽어 실행.
5. NOT NULL 제약 추가 (별도 마이그레이션).
6. RLS ENABLE + 정책 SQL (별도 마이그레이션).
7. 로컬 → prod 순서로 각각 적용.

### RLS 정책 (모든 테이블 공통)

```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_owner_select ON companies FOR SELECT
  USING (owner_id = auth.uid());
CREATE POLICY companies_owner_insert ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY companies_owner_update ON companies FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY companies_owner_delete ON companies FOR DELETE
  USING (owner_id = auth.uid());
```

- **NestJS 접근**: DB connection이 postgres user면 RLS bypass. defense-in-depth 원칙에 맞추려면 **service_role JWT + 세션 변수(`request.jwt.claim.sub`)** 로 접근 or NestJS도 anon key + user JWT 프록시. 이 결정은 12.4에서 재검토.
- **간단 옵션**: NestJS는 postgres user 유지(RLS bypass) + 서비스 레이어에서 owner_id 강제. RLS는 Supabase 클라이언트가 DB에 직접 붙는 미래 시나리오 대비 (프론트 → Supabase 직접 쿼리하는 경우 없으면 사실상 안 쓰임).
- **선택 (초안)**: 후자. 오버엔지니어링 방지. 12.4에서 다시 검증.

## 프론트 인증 흐름 (12.2) ✅

- 신규 dep: `@supabase/ssr` + `@supabase/supabase-js`. Next 16 proxy(=middleware)에서 세션 쿠키 refresh.
- `/login` 페이지: 이메일/비번 → `supabase.auth.signInWithPassword`.
- `/signup` 별도 페이지: 이메일/닉네임(주사위·중복검사)/비번/비번확인 → `supabase.auth.signUp` → `PUT /profiles/me`로 프로필 스탬프.
- 세션 저장: Supabase가 관리하는 쿠키 (`sb-<project-ref>-auth-token` 등). 기존 HMAC 쿠키(`auth-cookie.ts`) 제거.
- `/api/proxy/[...path]`: 세션 access_token 꺼내 `Authorization: Bearer` 헤더로 첨부. 기존 `X-Auth-Token` 로직 제거.
- SSR 서버 컴포넌트: `createServerClient` 로 세션 조회.

### profiles 테이블 (12.2에서 도입) ✅

원래 12.4에서 다룰 예정이었으나 닉네임 uniqueness 요건(중복 방지 = DB 제약 필요) 때문에 12.2에서 첫 auth-scoped 테이블로 선행 도입.

```
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    text UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
)
```

- 마이그레이션 `0010_strong_falcon.sql`. Drizzle이 auth schema를 모르므로 FK는 raw `ALTER TABLE`로 수동 추가.
- 엔드포인트: `GET /profiles/me`, `PUT /profiles/me`(upsert), `PATCH /profiles/me/nickname`, `GET /profiles/check-nickname`(Public, rate-limited).
- 닉네임 검증: `[\p{L}\p{N}_]+` 2~20자. 클라·서버·DB 3중.
- **RLS는 12.4에서 다른 도메인 테이블과 함께 활성**. 지금은 backend 서비스 레이어가 `req.user.id` 강제.

### 인증 계층 두 겹 유의사항

Next `proxy.ts` middleware + NestJS `SupabaseAuthGuard` 두 계층이 있어서 **공용 엔드포인트는 양쪽 다 열어야 함**. `check-nickname`은 NestJS `@Public()` + Next `PUBLIC_PATHS`에 `/api/proxy/profiles/check-nickname` 등록. 이 이중 원칙은 어떤 공용 API를 추가하든 그대로 적용.

### Server Action으로 server-only import 격리

`lib/api.ts`는 client·server 양쪽에서 쓰이는데 SSR fetch용 auth header에 `next/headers`(via `@supabase/ssr`)가 필요. Dynamic import 트릭은 Turbopack이 모듈 그래프에 포함시켜 client 번들 빌드 실패. → `lib/supabase/auth-header.ts`에 `'use server'` 지시자를 붙여 Server Action으로 분리. Client 번들엔 RPC 스텁만 남고 server-only 의존은 격리됨. (Server-side callers는 in-process 직접 호출로 hop 없음.) 다른 server-only 로직을 client-shared 파일에서 참조해야 할 때 재사용 가능한 패턴.

### Supabase Console 프로젝트 세팅 체크리스트

env 파일에 없는 프로젝트-레벨 설정. 로컬·prod 각 프로젝트에 개별 적용. 새 환경(staging 등) 만들 때도 동일하게.

- Authentication → Providers → **Email**: 활성 (기본)
- Authentication → Providers → Email → **"Confirm email"** 토글 OFF (로컬 SMTP 없이 개발 편의. 다인화하면 재검토)
- Authentication → Attack Protection → **"Prevent use of leaked passwords"**: **Pro Plan 전용** — Free tier에선 활성 불가. 프론트 `translateAuthError`는 미래 대비로 `pwned/leaked/compromised` 키워드 매칭 유지. 대안 필요해지면 backend에 HIBP k-anonymity API 직접 연동(약 50줄) or Pro 업그레이드($25/월). **현재는 미적용 감수** — 1인 사용 스코프에선 강한 비번을 본인이 선택하는 것으로 충분

## Google OAuth (12.3)

- Supabase Console → Authentication → Providers → Google 활성화.
- Google Cloud Console에서 OAuth 2.0 Client 생성. Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`.
- `/login`에 "Google로 로그인" 버튼 → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.
- `/auth/callback` 라우트: URL의 `code` → `exchangeCodeForSession` → 세션 쿠키 세팅 → 원래 페이지로 리다이렉트.
- 로컬 dev용 redirect URI 별도 등록.

## 환경 변수 목록

### 신규

| 이름 | 용도 | 노출 | 세팅 시점 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 브라우저 | 12.2 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_*` (신규 구조). 브라우저 노출 안전하되 RLS 전제 | 브라우저 | 12.2 |
| `SUPABASE_URL` | API 서버 Guard가 JWKS URL 조립용 | 서버 only | 12.1 |
| `SUPABASE_SECRET_KEY` | (선택) `sb_secret_*` — admin ops·RLS bypass용 | 서버 only | 12.4 이후 |

> **JWT 서명 secret 불필요** — JWKS(ES256/ECC P-256) 마이그레이션 완료 프로젝트라 공개키 fetch로 검증.
>
> **API Keys 신규 구조** — 이 프로젝트는 `sb_publishable_*` / `sb_secret_*` 형식. 레거시 `anon` / `service_role` 키는 사용 X. SDK는 문자열만 받으므로 env 이름은 자유지만 신규 명명(`PUBLISHABLE_KEY`/`SECRET_KEY`)으로 통일.
>
> **보안 순서 주의** — publishable key는 브라우저 노출 안전하다고 표기되지만 이는 **RLS 정책이 활성**이라는 전제. 12.4 완료 전에는 12.2/12.3의 prod 배포 금지. 로컬·preview에서만 검증.

### 제거 (12.2 완료 시점)

- `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` (web)
- `API_ACCESS_TOKEN` (api)

`.env.example` 동기화 필수 (CLAUDE.md #10).

## 롤백 안전장치

### 12.2 (프론트 로그인 교체)

- 브랜치별 커밋 단위: (a) Supabase 클라이언트 추가, (b) proxy.ts 교체, (c) login 페이지 교체, (d) Basic Auth 제거. 마지막 (d)는 별도 커밋으로 분리해 revert 쉽게. → 실제 15+ 커밋으로 세분화됨.
- Vercel: 프로덕션 배포 전 preview로 검증. **프로덕션 배포는 12.4(RLS) 완료 후에만** — publishable key가 브라우저 노출되는데 RLS 없으면 무방비.
- **Prod fail-fast (12.2에 추가)**: `bootstrap-env.ts` + Next `instrumentation.ts`가 `NODE_ENV=production && !SUPABASE_URL` 조건에서 startup throw. Guard의 no-op fallback을 실수로 prod에 실은 참사 방지.

### 12.4 (스키마 마이그레이션)

- **DB 백업**: 로컬/prod 각각 `pg_dump` 또는 Supabase Console SQL export. 스냅샷 파일 안전한 곳에 (커밋 X, 리포 밖 로컬 폴더).
- **단계별 마이그레이션**: 컬럼 추가(nullable) → 백필 → NOT NULL → RLS. 각 단계가 별도 마이그레이션 파일. 문제 시 이전 스텝까지만 되돌리기.
- **롤백 SQL**: 각 마이그레이션에 대응 down SQL을 `docs/phase-12-auth-rollback.sql`에 별도 보관 (Drizzle은 down auto 생성 안 함).
- **prod 적용 전 로컬 검증**: 로컬 DB에 마이그레이션 적용 → 앱 정상 작동 확인 → prod 적용.

## 오늘(12.0 + 12.1) 산출물 체크리스트

### 12.0

- [x] `docs/phase-12-auth.md` 작성 (이 파일)
- [ ] 사용자 리뷰 & 승인

### 12.1

- [ ] Supabase Console에서 email provider 활성화 상태 확인 (기본 켜져있음)
- [x] Supabase 프로젝트의 JWT signing 방식 확인 → **JWKS (ES256/ECC P-256)** 확정
- [x] `apps/api/src/supabase-auth.guard.ts` 스캐폴드
  - env(`SUPABASE_URL`) 미설정이면 `canActivate` no-op
  - 설정되면 `Authorization: Bearer` 헤더에서 JWT 추출, JWKS로 검증
  - `req.user = { id, email }` 세팅
  - `/health` 예외 (기존 `AccessTokenGuard`와 동일)
  - AppModule 등록 X (12.2에서)
- [x] `.env.example`에 신규 env 추가 (주석으로 "12.2부터 필요" 표시)
- [x] `jose` dep 추가

## 미결 (다음 서브페이즈에서 결정)

1. ~~JWT 라이브러리 선택~~ → **`jose` 확정** (2026-09-10)
2. ~~Supabase JWT 서명 방식~~ → **JWKS(ES256/ECC P-256) 확정** (2026-09-10, Console 확인)
3. NestJS DB connection이 RLS를 bypass할지, user JWT를 pass할지 — 12.4에서 재검토.
4. sign-up 페이지 별도 or `/login` 토글 — 12.2 착수 시.
5. 로컬 dev에서 이메일 확인 링크 처리 (Supabase 로컬 SMTP 없음) — 12.2 착수 시.
