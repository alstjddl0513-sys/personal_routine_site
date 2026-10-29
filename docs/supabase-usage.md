# Supabase 사용법 (이 프로젝트 기준)

> **언제 보나**: 로컬 dev DB를 처음 연결하거나, 연결 문자열·RLS·Studio 사용법이 헷갈릴 때.
> prod 마이그 적용은 [`release.md`](./release.md), 연결 오류는 [`troubleshooting.md`](./troubleshooting.md#supabase-연결-로컬-dev-세팅).

**목차**
- [쓰는 것](#쓰는-것)
- [프로젝트 2개 (dev · prod)](#프로젝트-2개-dev--prod)
- [연결 문자열 3종](#연결-문자열-3종)
- [로컬 dev 셋업](#로컬-dev-셋업)
- [스키마 바꾸기 (Drizzle)](#스키마-바꾸기-drizzle)
- [RLS](#rls)
- [Studio에서 볼 것](#studio에서-볼-것)
- [무료 티어 한도](#무료-티어-한도)

---

## 쓰는 것

**Postgres + Auth + Storage**를 한 벤더에서. Realtime·Edge Functions는 안 씀.

- **백엔드(NestJS)**: Drizzle → postgres.js → Session Pooler(5432). postgres role이라 RLS를 거치지 않음
- **프론트(Next.js)**: `@supabase/ssr`로 **인증 세션만**. DB는 직접 못 붙고 `/api/proxy → Render` 경유

## 프로젝트 2개 (dev · prod)

로컬 dev와 prod는 **별도 Supabase 프로젝트**다. 마이그·시드·유저가 각각 따로.
새 프로젝트: https://supabase.com/dashboard → New project → Region **Seoul**, DB 비밀번호는 반드시 따로 저장.

## 연결 문자열 3종

대시보드 상단 **Connect** 버튼에서 복사.

| 종류 | 포트 | 유저명 | 쓰는 곳 |
|--|--|--|--|
| Direct | 5432 | `postgres` | IPv6 전용 — **국내 IPv4 환경에선 DNS 실패**. 안 씀 |
| **Session pooler** | 5432 | `postgres.<project-ref>` | ⭐ 로컬 dev · Render · prod 마이그 |
| Transaction pooler | 6543 | `postgres.<project-ref>` | 서버리스용. 안 씀 |

- Direct 호스트는 `db.<ref>.supabase.co`, Pooler는 `aws-0-<region>.pooler.supabase.com`
- Pooler 유저명이 `postgres.<ref>`인 건 여러 프로젝트를 한 게이트웨이로 라우팅하기 때문

## 로컬 dev 셋업

1. 루트 `.env.example` → `.env` 복사 (`.env`는 gitignore)
2. **Session pooler** URI를 `DATABASE_URL`에 붙이고 `[YOUR-PASSWORD]` 치환
   비번 특수문자는 URL 인코딩: `#`→`%23`, `@`→`%40`, `!`→`%21`
3. Auth env (대시보드 → Settings → API Keys)
   - `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_…`
   - `SUPABASE_SECRET_KEY` = `sb_secret_…` (Admin API용, ⚠️ 커밋 금지)
4. `pnpm --filter api db:migrate` → `drizzle.__drizzle_migrations` 테이블이 생기면 연결 OK

## 스키마 바꾸기 (Drizzle)

```bash
# 1) apps/api/src/db/schema/*.ts 수정
pnpm --filter api db:generate   # 2) apps/api/drizzle/XXXX_*.sql 생성 → SQL 리뷰
pnpm --filter api db:migrate    # 3) 로컬 DB 적용
pnpm --filter api db:studio     # (선택) 브라우저 GUI
```

- 마이그 SQL은 **커밋한다**. DB를 손으로 직접 고치지 않는다. 이미 적용된 SQL은 고치지 말고 새 마이그로
- prod 적용은 [`release.md`](./release.md#3-prod-db-마이그레이션) — 파일 하나씩
- 상세 규칙: `apps/api/CLAUDE.md`

## RLS

`owner_id`가 있는 테이블마다 select/insert/update/delete 4정책.

- NestJS는 postgres role이라 RLS를 거치지 않음 → **소유권 검증은 서비스 레이어**(`where owner_id = req.user.id`)가 1차
- RLS는 서비스 필터가 새도 막아주는 **2차 방어선**
- 정책은 마이그 SQL에 함께 들어감 (`0013_rls_policies.sql`부터, 이후 새 테이블마다)
- 예외: `announcement_targets`는 의도적으로 정책 0개 — [troubleshooting 참고](./troubleshooting.md#supabase-security-advisor-announcement_targets-rls-enabled-no-policy)

실제 상태 확인:
```sql
SELECT tablename, cmd, COUNT(*) FROM pg_policies
WHERE schemaname = 'public' GROUP BY tablename, cmd ORDER BY tablename, cmd;
```

## Studio에서 볼 것

- **Table Editor** — 데이터 보기·수정
- **SQL Editor** — 조회용 (스키마 변경은 마이그로만)
- **Database → Schema Visualizer** — ERD
- **Authentication → Users** — 유저 UUID 복사 (`ADMIN_USER_IDS` 등)
- **Storage** — `documents` 버킷

## 무료 티어 한도

- Postgres 500MB · Storage 1GB · Egress 5GB/월
- 프로젝트 최대 2개 (dev·prod로 다 씀)
- **7일 미접속 시 자동 pause** → 대시보드에서 Restore (데이터 유지). Restore 직후엔 pooler 연결이 잠깐 실패할 수 있음
- built-in 메일은 사실상 못 씀 (시간당 몇 통, 전달 실패 잦음) → 비번 재설정은 Custom SMTP 필요
