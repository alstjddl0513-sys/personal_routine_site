# 배포 가이드 (Render + Vercel + Supabase)

첫 배포용 단계별 절차. Phase 9.1까지 코드 준비는 끝난 상태(`/api/proxy`, `AccessTokenGuard`, `proxy.ts` Basic Auth, `main.ts`의 `PORT`/`CORS_ALLOWED_ORIGIN` env 대응).

## 사전 조건

- GitHub의 `main` 브랜치가 배포하고 싶은 상태로 최신화됨 (개발은 `develop`에서, 릴리스 시 `develop → main` PR)
- Supabase 프로젝트가 이미 있고 로컬 `.env`의 `DATABASE_URL`이 정상 작동
- 로컬에서 `pnpm build && pnpm typecheck` 통과

---

## §1. Render — API 배포

### 서비스 생성

1. https://dashboard.render.com → **New +** → **Web Service**
2. GitHub 저장소 연결 → 이 repo 선택
3. 설정:
   - **Name**: `rally-api` (원하는 이름)
   - **Region**: Singapore (한국 기준 가장 가까움)
   - **Branch**: `main` (배포 지점. develop → main PR 병합 시 자동 재배포)
   - **Root Directory**: **비워둠** (`.`) — monorepo 워크스페이스 의존성(`@repo/shared: workspace:*`) 때문에 repo 루트가 필요
   - **Runtime**: Node
   - **Build Command**:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter api build
     ```
   - **Start Command**:
     ```
     pnpm --filter api start:prod
     ```
   - **Instance Type**: Free
   - **Health Check Path**: `/health`

### 환경 변수

Render 대시보드 → **Environment** → 추가:

| Key | Value | 비고 |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pw>@<host>:5432/postgres` | Supabase Session Pooler(port 5432). Direct(6543)는 IPv6 전용이라 실패 |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | 슬래시 없이. JWKS fetch 대상. 미설정 시 `bootstrap-env.ts`가 부팅 거부 |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Phase 12.4b 계정 탈퇴 + Phase 12.5 어드민(`auth.admin.deleteUser` · `listUsers` · `updateUserById`) 호출용. 미설정 시 해당 endpoint만 500. Console → Settings → API Keys → `sb_secret_*` 복사. **service_role 권한이라 서버 전용, 절대 커밋 X** |
| `ADMIN_USER_IDS` | `uuid-1,uuid-2` | Phase 12.5. 쉼표 구분. 어드민 UUID. 미설정 시 `/admin/*` 전부 403, profiles.me의 isAdmin은 false. Supabase Studio → Authentication → Users에서 uid 복사 |
| `CORS_ALLOWED_ORIGIN` | `*` | 임시. §3에서 Vercel URL로 교체 |
| `NODE_VERSION` | `22.11.0` | Node 20은 의존 트리 중 `node:sqlite`(22.5+) 요구 패키지로 실패. `22`만 넣지 말고 정확한 patch 버전으로 |

`PORT`는 Render가 자동 주입 — 설정하지 말 것.

Phase 12 이전에 있던 `API_ACCESS_TOKEN`은 이제 사용 X (SupabaseAuthGuard가 JWT 검증). 남아있으면 삭제 가능.

### DB 마이그레이션 (수동)

Render는 마이그레이션을 돌리지 않음. 릴리스마다 로컬에서 prod DB에 직접 적용. 상세 절차는 **§6 릴리스 절차** 참고.

### 배포 확인

1. **Manual Deploy** 클릭 → 빌드 로그 확인
2. 배포 완료 후 `https://<service>.onrender.com/health` 열기 → `{ "status": "ok", "db": "up" }` 응답
3. Render URL을 메모 (다음 단계에서 사용)

무료 티어는 **15분 idle 시 슬립** — 첫 요청은 콜드 스타트로 30초 걸릴 수 있음.

---

## §2. Vercel — Web 배포

### 프로젝트 생성

1. https://vercel.com/new → GitHub repo import
2. 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `apps/web`
   - **Build Command**: 기본값(`next build`) 그대로. Vercel이 pnpm workspace 자동 감지
   - **Install Command**: 기본값(`pnpm install`) 그대로
   - **Node.js Version**: 22.x (Render와 일관)

### 환경 변수

Vercel 대시보드 → **Settings** → **Environment Variables** → 추가 (모든 환경: Production/Preview/Development):

| Key | Value | 비고 |
|---|---|---|
| `API_INTERNAL_URL` | `https://<render-service>.onrender.com` | §1의 Render URL. **말미 슬래시 없이**. Secret 타입 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | §1 `SUPABASE_URL`과 동일값. Config 타입(브라우저 노출됨) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Supabase Console → Settings → API Keys. Config 타입(RLS가 최종 게이트) |

`API_INTERNAL_URL`은 **`NEXT_PUBLIC_` 접두어 없음** — 서버에서만 읽히고 브라우저엔 노출 안 됨. 클라이언트 mutation은 same-origin `/api/proxy` 경유.

Phase 12 이전에 있던 `API_ACCESS_TOKEN` · `BASIC_AUTH_USER` · `BASIC_AUTH_PASSWORD`는 이제 사용 X (Supabase Auth SDK가 세션 관리). 남아있으면 삭제 가능.

Env 저장만으론 자동 재배포 안 됨 — **Deployments → Redeploy** 수동 트리거 (Use existing Build Cache 체크 해제 권장).

### 배포 확인

1. **Deploy** 클릭 → 빌드 완료 대기
2. Vercel URL 열기 → `/login` 페이지로 리다이렉트
3. 신규 계정이면 `/signup` → 이메일/닉네임/비번 → 자동 로그인
4. `/jobs`, `/routines`, `/workouts` 로딩 확인
5. Vercel URL 메모

---

## §3. CORS 최종 조정

§1에서 `*`로 열어둔 걸 실제 Vercel URL로 좁힘.

1. Render 대시보드 → API 서비스 → **Environment** → `CORS_ALLOWED_ORIGIN` 편집
2. 값을 `https://<vercel-domain>.vercel.app`로 교체
   - preview 배포(브랜치별 도메인)도 허용하려면 comma-separated: `https://rally-web.vercel.app,https://rally-web-git-develop-<team>.vercel.app`
3. Render가 자동 재배포 (env 변경 시 트리거됨)
4. Vercel 사이트에서 `/jobs`에 회사 하나 추가해보고 실제 저장되는지 확인

---

## §4. 검증 체크리스트

배포 완료 후 하나씩 확인:

- [ ] Vercel URL 방문 시 `/login`으로 리다이렉트
- [ ] 신규 계정: `/signup` → 자동 로그인 → `/jobs`
- [ ] Sidebar 좌하단에 닉네임 표시 · Render `/health` 응답 `ok`
- [ ] `/jobs` 필터에 default 유형 6개 chip 뜸 (온보딩 auto-seed 결과)
- [ ] `/jobs` 회사 추가/편집이 저장됨 (F5 후에도 남아있음)
- [ ] `/routines` 시간블록 Enter 저장 → 딱 하나만 생성 · 체크박스 유지
- [ ] `/workouts` 세트 입력 후 blur → 저장 · 재로딩 후 유지
- [ ] `/blog` default 소스 8개 뜸 · RSS 새로고침 통과
- [ ] Render 대시보드 **Logs** 탭에 API 요청 남음 · 401 없음
- [ ] 브라우저 DevTools **Network** 탭에서 `/api/proxy/*` 호출이 200 · Authorization Bearer는 서버측에서만 첨부돼 브라우저 응답엔 노출 X

---

## §5. 스케줄러

무료 티어 Render는 15분 idle 시 슬립 + 자체 cron 없음. 구성:

1. **콜드 스타트 방지** — 외부 cronjob.org에서 5분마다 `/health/ping` (필수)
2. **RSS 자동 수집** — 서버 프로세스 안에서 `@nestjs/schedule` `@Cron('0 11,23 * * *')` (하루 2회, 08:00/20:00 KST). 외부 훅 불필요

### 외부 훅 · Health ping (콜드 스타트 방지)

https://cronjob.org 가입 → **Cronjobs** → **Create cronjob**:

| 필드 | 값 |
|---|---|
| Title | `rally health ping` |
| URL | `https://<render-service>.onrender.com/health/ping` |
| Method | GET |
| Schedule | Every 5 minutes |
| Timeout | 30s |

`/health/ping`은 `@Public()` 데코레이터로 `SupabaseAuthGuard`를 건너뛰므로 토큰 헤더 불필요. 응답은 순수 `{ok:true}` — DB ping이 붙은 `/health`(대시보드 진단용)와 달리 warmer용으로 부하를 최소화. 인터벌은 Render 무료 티어 유휴 슬립(15분)의 1/3 수준으로 5분을 권장.

**주의**: cronjob.org는 연속 실패가 누적되면 job을 자동 disable함. Render 콜드 스타트가 30초 넘으면 timeout이 반복되고 결국 꺼진다. **History에서 disable 이유 확인 → 필요하면 timeout 상향 후 재활성**. Health ping이 죽어 있으면 아래 내부 RSS cron도 서버 슬립 창에 미스될 수 있음.

**알림 세팅**: 매번 대시보드에 로그인해서 확인하지 않도록, job 편집 → **Notifications** 탭 → *Notify on failure* 체크. `Failures in a row`는 2~3 정도가 노이즈 덜함(첫 실패에 즉시 알림은 시끄러움). 등록된 계정 이메일로 자동 발송되므로, 문제가 생기면 메일 받고 그때만 대시보드 열면 됨.

### 내부 스케줄 · RSS refresh

코드로 구현. `apps/api/src/blog-posts/blog-posts.service.ts`의 `scheduledRefresh()`가 담당:

```ts
@Cron('0 11,23 * * *')  // UTC 기준 → 08:00·20:00 KST
async scheduledRefresh() { ... }
```

- 응답 크기·타임아웃·헤더 등 외부 cron 서비스의 제약 (예: cronjob.org "Failed (output too large)")에서 자유
- 실행 결과는 Render **Logs** 탭에서 `Scheduled RSS refresh…` / `added=N, processed=M` 로그로 확인
- 스케줄 변경은 `@Cron` 표현식만 수정 후 재배포

수동 트리거는 여전히 웹 `/blog`의 "RSS 새로고침" 버튼으로 가능.

### 왜 내부 cron으로 옮겼나 (2026-09)

초기엔 cronjob.org에 RSS refresh 훅도 등록하려 했으나:
- refresh 응답 JSON이 임계값을 초과해 cronjob.org가 "Failed (output too large)"로 표시 → 실패 이력 누적 → 자동 disable
- 서버 프로세스가 어차피 살아있어야 하는(health ping) 조건에선 앱 내부 cron이 응답 크기·타임아웃 제약 없이 단순

---

## §5.5 Google OAuth (Phase 12.3)

`/login`·`/signup`의 "Google로 계속하기" 버튼을 위한 Console 세팅. 코드 쪽은 `/auth/callback` route handler가 PKCE code exchange + 최초 로그인 시 랜덤 닉네임 profile 자동 생성까지 처리.

### Google Cloud Console

1. https://console.cloud.google.com/apis/credentials → 프로젝트 선택 (없으면 생성)
2. **Create Credentials** → **OAuth client ID** → **Web application**
3. **Authorized JavaScript origins**: (선택) 각 환경의 origin — `http://localhost:3000`, `https://<vercel-domain>.vercel.app`
4. **Authorized redirect URIs** (필수): 각 Supabase 프로젝트의 콜백 URL
   - 로컬 프로젝트: `https://<local-ref>.supabase.co/auth/v1/callback`
   - Prod 프로젝트: `https://<prod-ref>.supabase.co/auth/v1/callback`
5. 저장 후 **Client ID** · **Client Secret** 복사

### Supabase Console (로컬·prod 각각)

1. **Authentication** → **Providers** → **Google** 활성화
2. 위 Client ID / Secret 붙여넣고 저장
3. **URL Configuration** 탭에서 아래 확인
   - **Site URL**: 앱의 배포 origin (로컬은 `http://localhost:3000`)
   - **Redirect URLs**: `<origin>/auth/callback` 형태 등록 (로컬·prod 각각)

### 확장 시 참고 (Apple / 네이버 / 카카오 / GitHub)

- `signInWithOAuth({provider})`의 provider만 갈아 끼우면 동일한 `/auth/callback` 흐름을 재사용 가능
- 각 provider별로 (1) Provider Console에서 OAuth 앱 등록 → (2) Supabase Providers 탭에서 활성화 → (3) `/login`·`/signup`에 버튼 추가만 반복
- 네이버·카카오는 Supabase Auth 공식 provider가 아니므로 `signInWithIdToken` 또는 커스텀 SSO 경로가 필요 — 도입 시 재검토

---

## §6. 릴리스 절차 (develop → main)

### 흐름 요약

1. develop이 릴리스 준비 상태 (신규 마이그·기능 병합 완료)
2. 로컬에서 root `package.json` version bump → PR로 develop 병합 (예: `chore/release-X.Y.Z` 브랜치)
3. GitHub에서 **develop → main** 릴리스 PR 생성 · 병합
4. Render/Vercel이 main 감지 → 자동 재배포 (Vercel ~1분, Render ~2~5분)
5. **신규 마이그 파일이 있으면 prod Supabase에 수동 적용** (아래 절차)
6. 배포 완료 후 사이트 스모크 테스트 (§4 체크리스트)

### 마이그 적용 타이밍

| 변경 종류 | 예시 | 적용 순서 |
|---|---|---|
| additive | 새 컬럼(nullable) · 새 테이블 · 새 인덱스 | **코드 배포 전** — 새 API가 새 컬럼을 참조하므로 |
| destructive | 컬럼 drop · 테이블 drop · NOT NULL 추가 | **코드 배포 후** — 옛 API가 참조 중이면 500 |
| neutral | UNIQUE 해제 · 컬럼 rename(코드도 함께 변경) | 아무 순서 (release PR 병합 직후가 편함) |

`0009_curly_agent_brand.sql` (UNIQUE 해제)은 neutral. release PR 병합 직후 아무 때나 적용.

### 마이그 적용 (PowerShell)

**1. Prod DATABASE_URL 준비**

Supabase 대시보드 → 프로젝트 → **Project Settings** → **Database** → **Connection string** 탭 → **Session pooler** 선택 (Transaction 모드는 마이그레이션 부적합):

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Port `5432`(Session pooler) 확인. Direct(6543)는 IPv6 전용이라 국내에서 DNS 실패.

**2. 실행**

```powershell
# 세션 한정 env (창 닫으면 사라짐, .env 파일은 안 건드림)
$env:DATABASE_URL = "postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"

# 미적용 마이그 파일 확인 (선택. "No schema changes"면 스키마-DB 이미 일치)
pnpm.cmd --filter api db:generate

# 실제 적용
pnpm.cmd --filter api db:migrate
# → "Running migrations..." → "Migrations applied." 로그로 확인

# 세션 정리
Remove-Item env:DATABASE_URL
```

`pnpm.ps1`은 PowerShell 실행 정책에 막히므로 `.cmd` 래퍼 사용. `migrate.ts`가 dotenv를 default 모드로 로드해서 이미 세팅된 `$env:DATABASE_URL`을 안 덮음.

**3. 적용 확인**

Supabase 대시보드 → **SQL Editor**:

```sql
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY id DESC LIMIT 5;
```

방금 실행한 마이그 파일명 접두어(예: `0009`)의 hash가 뜨면 성공. 이후 API 재배포된 프로세스가 첫 요청부터 정상 동작해야 함.

### 여러 개 미적용 마이그를 한 번에 돌릴 때 주의

Drizzle 마이그레이터(`drizzle-orm@0.45+ postgres-js/dialect`)는 pending 마이그를 **모두 하나의 `session.transaction`으로 감싼다**. 한 파일이 실패하면 앞서 성공한 파일도 롤백되는 게 원칙 — 근데 실제로는 postgres.js 상호작용에 따라 컬럼만 반영되고 트래킹 row는 미갱신인 어중간한 상태에 빠진 사례가 있음 (Phase 12.4 prod 적용 때 발생).

원칙:
- **prod에는 미적용 마이그를 여러 개 쌓아두지 말 것.** 릴리스마다 한 개씩. 여러 개 쌓였다면 **파일 하나만 적용하고 검증** → 다음 파일 순으로.
- 파일 하나만 개별 실행하는 표준 방법은 Drizzle에 없음. 우회로 `apps/api/src/db/apply-sql-file.ts` 사용:
  ```powershell
  # 특정 파일만 직접 적용 (Drizzle 트래킹 우회, 수동 INSERT 필요)
  pnpm.cmd exec tsx src/db/apply-sql-file.ts drizzle/0011_easy_squirrel_girl.sql

  # 이 경우 Drizzle 트래킹에 수동 INSERT 필요 (그래야 다음 db:migrate가 skip)
  # created_at 값은 apps/api/drizzle/meta/_journal.json의 `when` 필드에서 확인
  ```
  SQL Editor에서:
  ```sql
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  VALUES ('0011_manual_apply', 1789056982562);
  ```

### Prod 대시보드 vs DATABASE_URL 프로젝트 REF 크로스체크 (필수)

Prod 마이그 실행 전 반드시 확인:
- `$env:DATABASE_URL`의 `postgres.<REF>` 부분 (예: `postgres.ubdqvwmeblmdiloajbvn`)
- 그 SQL Editor를 열어놓은 Supabase Console URL의 `dashboard/project/<REF>/` 부분

두 REF가 **정확히 동일**해야 함. 국내 로컬 Supabase와 prod Supabase 모두 유사한 무작위 문자열이라 눈으로 `l`↔`il` 정도의 한 글자 차이를 쉽게 놓친다. 다르면 SQL Editor는 prod가 아닌 로컬(또는 다른 프로젝트)을 보고 있음.

### 롤백

- 안전한 방법: **미리 대비**. destructive 마이그면 실행 전 Supabase SQL Editor에서 백업 dump 확보 (예: `pg_dump` 흉내로 CREATE TABLE + INSERT SELECT 저장)
- Free 티어는 자동 백업 7일 · Point-in-time recovery는 Pro만
- 급하면 수동 SQL로 revert (예: UNIQUE 해제 롤백 = `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE(...)`). 이 경우 `drizzle.__drizzle_migrations`에서 해당 row도 delete해야 다음 `db:migrate`가 재시도 안 함

### 릴리스 체크리스트

- [ ] develop → main PR 병합 완료
- [ ] Vercel 배포 성공 (Deployments 탭 · production alias 갱신)
- [ ] Render 배포 성공 (Events 탭 · "Deploy live")
- [ ] 신규 마이그 파일 확인 → 있으면 위 절차로 prod 적용
- [ ] `/health` 응답 정상
- [ ] 배포 사이트 접속 → 스모크 테스트 (§4)
- [ ] 새 기능 하나 실제 조작 (릴리스 노트에 있는 것)
- [ ] `docs/todo.md`의 이번 릴리스 항목 체크

---

## 트러블슈팅

배포·런타임 문제는 [`docs/troubleshooting.md`](./troubleshooting.md) 참고 (Render 배포 · Vercel 배포 · Supabase 연결 · 스케줄러 섹션).
