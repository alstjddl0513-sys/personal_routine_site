# Phase 12 — Auth (Supabase Auth 다인화) ✅ 완료

> 상태: 완료 (2026-09-10~19 진행). 이 문서는 주요 설계 결정과 결과만 요약. 상세는 코드(마이그 · service · guard)가 진실.

## 목표 · 비목표

**목표**
- Basic Auth 쿠키 세션 → Supabase Auth (Email/Password + Google OAuth) 교체
- 모든 도메인 테이블에 `owner_id uuid FK auth.users` + RLS 4정책
- NestJS 서비스 레이어에서 `where owner_id = req.user.id`, RLS는 defense-in-depth
- 기존 1인 데이터 내 계정으로 손실 없이 귀속

**비목표**
- 실시간 세션 무효화 · 2FA · magic link
- 팀/조직 개념 (multi-tenant 아닌 multi-user)

## 서브페이즈 결과

| # | 산출물 | PR/브랜치 |
|--|--|--|
| 12.0 | 이 설계 문서 (2026-09-10) | — |
| 12.1 | `SupabaseAuthGuard` 스캐폴드 (jose + JWKS/ES256) | — |
| 12.2 | 프론트 로그인 교체 · `profiles` 테이블 · `proxy.ts` 재작성 · Basic Auth 제거 · rate limit · prod env hard-fail | — |
| 12.3 | Google OAuth · `/auth/callback` PKCE · 랜덤 닉네임 auto-create | PR #68 |
| 12.4 | `owner_id` + RLS 마이그 (10 도메인 테이블 · 백필 · NOT NULL · 4정책×11) | PR #57 (5커밋 A~E) |
| 12.4b | 계정 탈퇴 (`DELETE /profiles/me` + Admin API, 2단계 confirm) | PR #69 |
| 12.5 | 어드민 페이지 · 사용자 목록/차단 · 공지 CRUD · 3 신규 테이블(마이그 `0022`) | `feat/phase-12/admin-page` |

## 주요 설계 결정

### 1. JWT 검증 = JWKS (ES256), `jose` 라이브러리

- Supabase가 이미 JWKS(ES256/ECC P-256) 마이그레이션 완료 → shared secret 불필요
- `jose`의 `createRemoteJWKSet`으로 `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` fetch · 자동 캐싱 · 키 회전 대응
- env는 `SUPABASE_URL`만 있으면 됨 (secret 없음)

### 2. RLS는 defense-in-depth (서비스 레이어가 1차 게이트)

- **NestJS는 postgres role(Session Pooler)** 접근 → RLS bypass. 소유권은 서비스 레이어에서 강제
- RLS는 프론트가 supabase-js로 DB 직접 붙는 미래 시나리오 대비 안전망
- 정책 shape (11 테이블 공통):
  ```sql
  ENABLE ROW LEVEL SECURITY;
  CREATE POLICY <t>_owner_<cmd> FOR <SEL|INS|UPD|DEL> USING/WITH CHECK (owner_id = auth.uid());
  ```

### 3. `profiles` 테이블은 12.2에서 선행 도입

원래 12.4 예정이었으나 닉네임 uniqueness(DB UNIQUE 필요) 때문에 12.2로 앞당김. `profiles.id` = `auth.users.id` FK CASCADE.

### 4. 자식 테이블은 owner_id denormalize

- `routine_checks` · `workout_sets` · `blog_posts` 등은 부모의 `owner_id` 복사 (SQL join 회피, RLS 정책 균일화)
- INSERT/UPDATE 시 부모 owner_id 복사는 앱 레이어 (DB trigger는 오버엔지니어링)

### 5. 어드민은 env `ADMIN_USER_IDS` (다인 어드민은 트리거 대기)

- 쉼표 구분 UUID를 env에 등록 → `AdminGuard`가 매치
- 다인 어드민 필요 시 `profiles.role` enum으로 이관 (지금은 트리거 없음)

## Prod 마이그 실패 사례 (12.4)

12.4의 4~5개 마이그를 prod에 한 번에 돌렸다가 컬럼만 반영되고 트래킹 row는 누락된 부분 반영 상태 발생. 원인·복구는 `docs/troubleshooting.md` "Prod 마이그레이션 실패 후 스키마-Drizzle 트래킹 불일치" 참고.

이후 원칙: **prod엔 미적용 마이그를 여러 개 쌓지 말 것.** 릴리스마다 한 개씩. 여러 개 필요하면 `apps/api/src/db/apply-sql-file.ts` 유틸로 파일 하나씩 개별 적용 + 수동 트래킹 INSERT.

## 관련 코드

- `apps/api/src/supabase-auth.guard.ts` — JWKS 검증
- `apps/api/src/db/schema/profiles.ts`
- `apps/api/drizzle/0010`~`0022` — auth/RLS 관련 마이그 (0013 RLS 정책, 0022 announcements)
- `apps/web/src/proxy.ts` · `apps/web/src/lib/supabase/*.ts`
- `apps/web/src/app/(auth)/*` · `/auth/callback`
- `apps/api/src/admin/*` — Phase 12.5 어드민

## 관련 문서

- `docs/architecture.md` — 배포 아키텍처 전체
- `docs/deployment.md` — 실제 배포 절차 (env 세팅 · Google OAuth Console 등)
- `docs/supabase-usage.md` — Supabase 사용법
- `docs/troubleshooting.md` — 배포·인증 삽질 로그
