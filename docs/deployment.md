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
| `API_ACCESS_TOKEN` | `openssl rand -hex 32` 실행값 | 32바이트 랜덤. §2 Web env와 **반드시 동일값** |
| `CORS_ALLOWED_ORIGIN` | `*` | 임시. §3에서 Vercel URL로 교체 |
| `NODE_VERSION` | `22.11.0` | Node 20은 의존 트리 중 `node:sqlite`(22.5+) 요구 패키지로 실패. `22`만 넣지 말고 정확한 patch 버전으로 |

`PORT`는 Render가 자동 주입 — 설정하지 말 것.

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
| `API_INTERNAL_URL` | `https://<render-service>.onrender.com` | §1의 Render URL. **말미 슬래시 없이** |
| `API_ACCESS_TOKEN` | §1과 동일값 | 다르면 API가 401 반환 |
| `BASIC_AUTH_USER` | 원하는 사용자명 | Basic Auth 활성화. 비워두면 스킵 |
| `BASIC_AUTH_PASSWORD` | 강한 비밀번호 | 위와 짝. 둘 다 세팅돼야 활성화 |

`API_INTERNAL_URL`은 **`NEXT_PUBLIC_` 접두어 없음** — 서버에서만 읽히고 브라우저엔 노출 안 됨. 클라이언트 mutation은 same-origin `/api/proxy` 경유.

### 배포 확인

1. **Deploy** 클릭 → 빌드 완료 대기
2. Vercel URL 열기 → 브라우저가 Basic Auth 프롬프트 → 위 계정 입력
3. `/jobs`, `/routines`, `/workouts` 로딩 확인
4. Vercel URL 메모

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

- [ ] Vercel URL 방문 시 Basic Auth 프롬프트가 뜬다
- [ ] 로그인 후 `/` 홈에서 `/health` 응답이 `ok`
- [ ] `/jobs` 로딩 · 회사 추가/편집이 저장됨 (F5 후에도 남아있음)
- [ ] `/routines` 시간블록 추가/체크 저장됨
- [ ] `/workouts` 세트 입력 후 blur → 저장 · 재로딩 후 유지
- [ ] `/workouts/statistics` 그래프·히트맵 렌더
- [ ] Render 대시보드 **Logs** 탭에 API 요청 남음
- [ ] 브라우저 DevTools **Network** 탭에서 `/api/proxy/*` 호출이 200이고 X-Auth-Token 헤더는 노출되지 **않음**(서버측 첨부라 정상)

---

## §5. 스케줄러

무료 티어 Render는 15분 idle 시 슬립 + 자체 cron 없음. 구성:

1. **콜드 스타트 방지** — 외부 cronjob.org에서 10분마다 `/health` (필수)
2. **RSS 자동 수집** — 서버 프로세스 안에서 `@nestjs/schedule` `@Cron('0 11,23 * * *')` (하루 2회, 08:00/20:00 KST). 외부 훅 불필요

### 외부 훅 · Health ping (콜드 스타트 방지)

https://cronjob.org 가입 → **Cronjobs** → **Create cronjob**:

| 필드 | 값 |
|---|---|
| Title | `rally health ping` |
| URL | `https://<render-service>.onrender.com/health` |
| Method | GET |
| Schedule | Every 10 minutes |
| Timeout | 30s |

`/health`는 `AccessTokenGuard` 예외라 토큰 헤더 불필요.

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
