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
| `NODE_VERSION` | `20` | Render 기본이 낮을 수 있음 |

`PORT`는 Render가 자동 주입 — 설정하지 말 것.

### DB 마이그레이션 (수동)

Render는 마이그레이션을 돌리지 않음. **로컬에서** prod DB에 직접 적용:

```bash
# .env를 잠시 prod로 스왑하거나, 별도 shell에서:
DATABASE_URL="<prod URL>" pnpm --filter api db:migrate
```

Windows PowerShell:

```powershell
$env:DATABASE_URL="<prod URL>"
pnpm.cmd --filter api db:migrate   # pnpm.ps1이 실행 정책에 막히므로 .cmd 래퍼
Remove-Item env:DATABASE_URL       # 세션 정리 (또는 창 닫기)
```

`migrate.ts`가 dotenv를 default 모드로 로드해서 이미 세팅된 `$env:DATABASE_URL`을 덮지 않으므로 `.env` 파일은 그대로 둬도 됨.

이후 새 마이그레이션 파일 생성할 때마다 동일 수동 절차. (`CLAUDE.md` 규칙 4: 자동 실행 금지)

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
   - **Node.js Version**: 20.x

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

## 트러블슈팅 요약

| 증상 | 원인 · 해결 |
|---|---|
| Render 빌드 `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE` | Root Directory를 `apps/api`로 세팅함 → `.`로 되돌리기 |
| 클라이언트에서 API 호출 시 401 | Web/API의 `API_ACCESS_TOKEN` 값 불일치 |
| 브라우저 CORS 에러 | Render `CORS_ALLOWED_ORIGIN`이 아직 `*`거나 Vercel URL과 오타. 재배포 필요 |
| Render 첫 요청이 30초 걸림 | 무료 티어 콜드 스타트. 유료 전환 or cron으로 5분마다 `/health` 핑 |
| Supabase 연결 실패 (`ENOTFOUND`) | Session Pooler(port 5432) 아닌 Direct(6543) 사용 중. 문자열 재확인 |
| Vercel 빌드에서 `@repo/shared` 못 찾음 | Root Directory가 `apps/web`이 맞는지 · pnpm-lock.yaml 커밋됐는지 확인 |
