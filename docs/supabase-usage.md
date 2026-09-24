# Supabase 사용법 (이 프로젝트 기준)

공부용 요약. 자세한 건 https://supabase.com/docs 참고.

## 1. 이 프로젝트에서 쓰는 것

**매니지드 PostgreSQL + Auth + Storage** 를 한 벤더에서 통합 사용. Realtime·Edge Functions은 미사용.

| 기능 | 도입 시점 | 용도 |
|--|--|--|
| **Postgres** | Phase 0 | 유일한 영속 계층. Drizzle ORM + postgres.js |
| **Auth** | Phase 12.2 · 12.3 | Email/Password + Google OAuth. JWKS/ES256 |
| **Row Level Security** | Phase 12.4 | 유저별 데이터 격리 (4 정책 × 17 도메인 테이블) |
| **Storage** | Phase 12.5C | `documents` private 버킷 (이력서·포폴 PDF, 50MB) |

접근 경로 두 갈래:
- **백엔드(NestJS)**: `Drizzle → postgres.js → Session Pooler(5432)`. postgres role, RLS 우회 (service_role)
- **프론트(Next.js)**: `@supabase/ssr` 로 auth 세션만. DB는 직접 못 붙고 `/api/proxy → Render` 경유

## 2. 프로젝트 생성

1. https://supabase.com/dashboard 로그인 (GitHub 권장)
2. **New project**
3. Name, DB Password(⚠️ 반드시 저장), Region(**Seoul**), Free plan
4. 1~2분 프로비저닝

**이 프로젝트는 로컬 dev · prod 각각 별도 Supabase 프로젝트** — 마이그·시드·유저 각각 관리.

## 3. 연결 문자열 3종

Dashboard 상단 **Connect** 버튼 팝업:

| 종류 | 포트 | 유저 형식 | 언제 씀 |
|--|--|--|--|
| Direct connection | 5432 | `postgres` | IPv6 지원 환경만. **국내 IPv4 환경에선 DNS 실패** |
| **Session pooler** | 5432 | `postgres.<project-ref>` | ⭐ 로컬 dev · Render(long-running). IPv4 |
| Transaction pooler | 6543 | `postgres.<project-ref>` | 서버리스/Edge (지금은 미사용) |

**핵심 차이**:
- Direct는 `db.<ref>.supabase.co` (IPv6-only)
- Pooler는 `aws-0-<region>.pooler.supabase.com` (IPv4)
- Pooler는 유저명이 `postgres.<project-ref>` (여러 테넌트 라우팅 때문)

## 4. 로컬 dev 셋업

1. 루트 `.env.example` 복사 → `.env` 생성 (`.env`는 gitignore)
2. Supabase Connect → **Session pooler** URI 복사
3. `.env`의 `DATABASE_URL=`에 붙여넣고 `[YOUR-PASSWORD]` 치환
4. 특수문자는 **URL 인코딩**: `#`→`%23`, `@`→`%40`, `!`→`%21`
5. Auth 관련 env도 세팅:
   - `SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_URL` = 위와 동일
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Dashboard → Settings → API Keys → `sb_publishable_*`
   - `SUPABASE_SECRET_KEY` = 같은 곳 → `sb_secret_*` (Admin API용, ⚠️ 커밋 금지)
6. `pnpm --filter api db:migrate` — 부기 테이블(`drizzle.__drizzle_migrations`) 생성 확인

## 5. Drizzle 마이그레이션 흐름

```bash
# 1) 스키마 파일 수정: apps/api/src/db/schema/*.ts

# 2) SQL 파일 자동 생성 (apps/api/drizzle/XXXX_xxx.sql)
pnpm --filter api db:generate

# 3) 생성된 SQL 리뷰 후 로컬 DB 적용
pnpm --filter api db:migrate

# 4) DB 상태 GUI로 보고 싶으면
pnpm --filter api db:studio
```

**규칙** (CLAUDE.md §4):
- 마이그 파일은 **커밋한다** (상태 동기화 소스)
- 손으로 SQL을 DB에 직접 실행하지 말 것
- 이미 적용된 마이그 SQL은 절대 편집 말 것 → 새 마이그로 정정
- **Prod엔 미적용 마이그를 여러 개 쌓지 말 것** — 한 번에 여러 개 돌리면 부분 반영 상태에 빠질 수 있음 (Phase 12.4 사례). 파일 하나씩 개별 적용은 `apps/api/src/db/apply-sql-file.ts` 유틸

## 6. RLS (Row Level Security)

Phase 12.4 이후 `owner_id` 있는 모든 테이블에 4 정책 (SELECT/INSERT/UPDATE/DELETE) 적용.

- **NestJS는 postgres role(Session Pooler)**로 접근 → RLS bypass. 소유권 검증은 서비스 레이어에서 `where owner_id = req.user.id`
- **RLS는 defense-in-depth** — 만약 서비스 필터가 새더라도 최종 게이트로 유출 방지
- 프론트에서 supabase-js로 DB 직접 접근 코드는 **0개** (모든 데이터는 프록시 경유)

정책 정의 위치: `apps/api/drizzle/0013_rls_policies.sql` 시작, 이후 신규 테이블마다 함께 정책 추가 (0014·0015·0017·0021·0022·0023).

Prod RLS 실 상태 확인:
```sql
SELECT tablename, cmd, COUNT(*) FROM pg_policies
WHERE schemaname = 'public' GROUP BY tablename, cmd ORDER BY tablename, cmd;
```

## 7. Supabase Studio (SQL/데이터)

Dashboard 좌측 사이드바:
- **Table Editor** — CRUD (엑셀 느낌)
- **SQL Editor** — 조회용만 (스키마 변경은 마이그로)
- **Database → Tables** — 스키마 훑기
- **Database → Schema Visualizer** — ERD 자동 그림
- **Authentication → Users** — 유저 목록 (UUID 복사 가능)
- **Storage** — `documents` 버킷 (private)

## 8. 자주 만나는 오류

| 증상 | 원인 | 해결 |
|--|--|--|
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | Direct 문자열, IPv6 없음 | Session pooler로 교체 |
| `password authentication failed for user "postgres"` | Pooler인데 유저를 `postgres`로만 씀 | `postgres.<project-ref>`로 |
| `password authentication failed` (유저는 맞음) | 비번 오타·URL 인코딩 누락 | 재확인 |
| `connection terminated unexpectedly` | Free 티어 7일 미접속으로 pause | Dashboard에서 Restore |
| SSL 에러 | `ssl` 옵션 미지정 | postgres 클라이언트에 `ssl: 'require'` (이미 적용됨) |

더 많은 삽질 로그: `docs/troubleshooting.md`

## 9. Free 티어 제약

- Postgres 500MB
- 프로젝트 최대 2개 (dev · prod로 2개 다 씀)
- **7일 미접속 시 자동 pause** → Restore 필요 (데이터는 유지)
- Egress 5GB/월
- SMTP: 시간당 3건 built-in (비번 재설정에 부족 → Custom SMTP는 트리거 대기)
- Storage 1GB · 파일당 50MB (config)

## 10. 참고

- [Supabase 공식 문서](https://supabase.com/docs)
- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- 프로젝트 규칙: `CLAUDE.md`
- 배포 환경 설정: `docs/deployment.md`
- 아키텍처 전체 그림: `docs/architecture.md`
