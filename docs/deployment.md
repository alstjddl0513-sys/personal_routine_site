# 최초 배포 세팅 (Render + Vercel + Supabase)

> **언제 보나**: 서버를 처음 세팅하거나 다시 만들 때, env·스케줄러·OAuth 설정을 고칠 때. **1회성 작업.**
> 매번 하는 배포(develop → main, prod 마이그)는 [`release.md`](./release.md).
> 구조 그림은 [`architecture.md`](./architecture.md).

**목차**
- [사전 조건](#사전-조건)
- [1. Render — API](#1-render--api)
- [2. Vercel — Web](#2-vercel--web)
- [3. CORS 좁히기](#3-cors-좁히기)
- [4. 스케줄러](#4-스케줄러)
- [5. Google OAuth](#5-google-oauth)
- [env 한눈에 보기](#env-한눈에-보기)

---

## 사전 조건

- `main`이 배포하려는 상태 (개발은 `develop`, 배포는 `develop → main` PR)
- Supabase **prod 프로젝트**가 있고 마이그 적용 완료 (dev 프로젝트와 별도 — [`supabase-usage.md`](./supabase-usage.md))
- 로컬에서 `pnpm build && pnpm typecheck` 통과

---

## 1. Render — API

**서비스 생성**: https://dashboard.render.com → **New +** → **Web Service** → 이 repo

| 항목 | 값 | 이유 |
|--|--|--|
| Region | Singapore | 한국에서 가장 가까움 |
| Branch | `main` | 병합 시 자동 재배포 |
| Root Directory | **비워둠** (`.`) | `@repo/shared` 워크스페이스 의존 때문에 repo 루트 필요 |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter api build` | |
| Start Command | `pnpm --filter api start:prod` | |
| Instance Type | Free | 15분 idle 시 슬립 → [스케줄러](#4-스케줄러)로 완화 |
| Health Check Path | `/health` | |

**환경 변수** (Environment 탭)

| Key | 값 | 메모 |
|--|--|--|
| `DATABASE_URL` | Supabase **Session pooler** 문자열 (포트 5432) | Direct는 IPv6 전용이라 실패 |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (끝 슬래시 X) | JWT 검증용 JWKS 주소. 없으면 `bootstrap-env.ts`가 부팅 거부 |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | 계정 탈퇴·어드민 API용. **서버 전용, 절대 커밋 X** |
| `ADMIN_USER_IDS` | `uuid-1,uuid-2` | 어드민 UUID(쉼표 구분). 없으면 `/admin/*` 전부 403 |
| `CORS_ALLOWED_ORIGIN` | 처음엔 `*` | [3](#3-cors-좁히기)에서 Vercel URL로 교체 |
| `NODE_VERSION` | `22.11.0` | 20은 `node:sqlite` 요구 패키지 때문에 실패. `22`처럼 메이저만 쓰지 말 것 |

- `PORT`는 Render가 주입 — 직접 넣지 말 것
- 옛 env(`API_ACCESS_TOKEN`)가 남아 있으면 삭제 (Supabase Auth로 대체됨)

**확인**: Manual Deploy → 빌드 로그 → `https://<service>.onrender.com/health`가 `{ "status": "ok", "db": "up" }`. 첫 요청은 콜드 스타트로 30초쯤 걸릴 수 있음.

---

## 2. Vercel — Web

**프로젝트 생성**: https://vercel.com/new → repo import

| 항목 | 값 | 이유 |
|--|--|--|
| Root Directory | `apps/web` | |
| Build / Install | 기본값 | pnpm workspace 자동 감지 |
| Node.js | 22.x | Render와 맞춤 |
| Function Region | **Seoul (`icn1`)** | 기본 `iad1`(미국)이면 SSR 왕복마다 400ms+ 손해. `apps/web/vercel.json`에도 박혀 있지만 대시보드도 확인 |

**환경 변수** (Production · Preview · Development 모두)

| Key | 값 | 메모 |
|--|--|--|
| `API_INTERNAL_URL` | Render URL (끝 슬래시 X) | 서버 전용. 브라우저는 same-origin `/api/proxy` 경유 |
| `NEXT_PUBLIC_SUPABASE_URL` | Render의 `SUPABASE_URL`과 같은 값 | 브라우저 노출됨 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | 브라우저 노출됨 (RLS가 최종 방어선) |

- env를 저장해도 자동 재배포 안 됨 → **Deployments → Redeploy** (빌드 캐시 체크 해제 권장)
- 옛 env(`API_ACCESS_TOKEN`, `BASIC_AUTH_*`)가 남아 있으면 삭제

**확인**: Vercel URL → `/login`으로 이동 → 가입·로그인 → `/today` 착지.

---

## 3. CORS 좁히기

1. Render → Environment → `CORS_ALLOWED_ORIGIN`
2. `*`를 실제 Vercel 주소로. 프리뷰 배포도 허용하려면 쉼표로 이어서:
   `https://rally-web.vercel.app,https://rally-web-git-develop-<team>.vercel.app`
3. Render 자동 재배포 후 `/jobs`에 회사 하나 추가해서 저장되는지 확인

---

## 4. 스케줄러

Render 무료 티어는 15분 idle 시 슬립하고 자체 cron이 없다.

| 할 일 | 방식 | 설정 위치 |
|--|--|--|
| 슬립 방지 | 외부 cronjob.org가 5분마다 `/health/ping` 호출 | cronjob.org (아래) |
| RSS 자동 수집 | 서버 안 `@nestjs/schedule` `@Cron('0 11,23 * * *')` (UTC → 08:00·20:00 KST) | 코드 `blog-posts.service.ts` `scheduledRefresh()` |

**cronjob.org 등록**: https://cronjob.org → Cronjobs → Create

| 필드 | 값 |
|--|--|
| URL | `https://<render-service>.onrender.com/health/ping` |
| Method / Schedule | GET / Every 5 minutes |
| Timeout | 30s (콜드 스타트로 자주 실패하면 45~60s) |
| Notifications | *Notify on failure*, Failures in a row 2~3 |

- `/health/ping`은 인증을 건너뛰고(`@Public()`) DB도 안 건드리는 가벼운 응답. `/health`는 DB 확인까지 하는 진단용
- cronjob.org는 연속 실패가 쌓이면 **자동으로 꺼짐** → History에서 원인 확인 후 재활성
- RSS 수집 결과는 Render Logs의 `Scheduled RSS refresh…` 로그. 스케줄 변경은 `@Cron` 식 수정 후 재배포
- RSS를 외부 cron으로 안 돌리는 이유: 응답이 커서 cronjob.org가 "output too large"로 실패 처리 → 자동 비활성화됐음

---

## 5. Google OAuth

코드는 `/auth/callback`이 PKCE 코드 교환 + 첫 로그인 시 랜덤 닉네임 프로필 생성까지 처리한다. 콘솔 설정만 하면 됨.

**Google Cloud Console** (https://console.cloud.google.com/apis/credentials)
1. Create Credentials → OAuth client ID → Web application
2. Authorized redirect URIs (필수) — Supabase 프로젝트마다:
   `https://<dev-ref>.supabase.co/auth/v1/callback`, `https://<prod-ref>.supabase.co/auth/v1/callback`
3. Client ID · Secret 복사

**Supabase Console** (dev·prod 각각)
1. Authentication → Providers → Google 활성화 → ID·Secret 입력
2. URL Configuration
   - Site URL: 앱 주소 (dev는 `http://localhost:3000`)
   - Redirect URLs: `<앱 주소>/auth/callback`

다른 provider(Apple·GitHub 등)도 `signInWithOAuth({ provider })`만 바꾸면 같은 `/auth/callback`을 재사용. 네이버·카카오는 Supabase 공식 provider가 아니라 별도 검토 필요.

---

## env 한눈에 보기

| 변수 | 로컬 `.env` | Render | Vercel |
|--|:--:|:--:|:--:|
| `DATABASE_URL` | ✓ | ✓ | |
| `SUPABASE_URL` | ✓ | ✓ | |
| `SUPABASE_SECRET_KEY` | ✓ | ✓ | |
| `ADMIN_USER_IDS` | ✓ | ✓ | |
| `CORS_ALLOWED_ORIGIN` | ✓ | ✓ | |
| `API_PORT` | ✓ (기본 3001) | | |
| `API_INTERNAL_URL` | ✓ | | ✓ |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | | ✓ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | | ✓ |

새 env를 추가하면 `.env.example`과 이 표도 같이 갱신.

배포·운영 중 문제는 [`troubleshooting.md`](./troubleshooting.md#배포).
