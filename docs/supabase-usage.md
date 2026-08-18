# Supabase 사용법 (이 프로젝트 기준)

공부용 요약. 자세한 건 https://supabase.com/docs 참고.

## 1. Supabase가 뭐냐

한 줄로: **매니지드 PostgreSQL + 부가 서비스(Auth, Storage, Realtime 등)** 를 무료 티어로 제공하는 SaaS.

이 프로젝트는 **DB만** 사용한다. Auth/Storage/Realtime은 안 씀. (기획서 4.4)

- 우리는 NestJS 백엔드에서 **Drizzle ORM → postgres.js 드라이버 → Supabase Postgres** 순으로 붙는다.
- Supabase의 REST API(PostgREST)나 `@supabase/supabase-js` 클라이언트는 안 쓴다.

## 2. 프로젝트 생성

1. https://supabase.com/dashboard 로그인 (GitHub 권장)
2. **New project**
3. Name, DB Password(⚠️ 반드시 저장), Region(**Seoul**), Free plan
4. 1~2분 프로비저닝

## 3. 연결 문자열 3종

Supabase Dashboard 상단 우측 **Connect** 버튼을 누르면 팝업으로 여러 문자열이 나온다.

| 종류 | 포트 | 유저 형식 | 언제 씀 |
|---|---|---|---|
| Direct connection | 5432 | `postgres` | 다른 Postgres 툴에서 IPv6 지원될 때. **국내 IPv4 환경에선 DNS 실패** |
| **Session pooler** | 5432 | `postgres.<project-ref>` | ⭐ 로컬 개발. 커넥션이 세션 단위로 살아있음 (일반 웹 서버에 적합) |
| Transaction pooler | 6543 | `postgres.<project-ref>` | 서버리스/Edge 배포. 트랜잭션 단위로만 커넥션 잡음 |

**핵심 차이**:
- Direct는 `db.<ref>.supabase.co` 호스트 (IPv6-only, 유료 애드온으로 IPv4 가능)
- Pooler는 `aws-0-<region>.pooler.supabase.com` 호스트 (IPv4 지원)
- Pooler를 쓰면 유저명이 `postgres.<project-ref>`로 바뀐다 (Pooler가 여러 프로젝트를 라우팅하므로 tenant 지정 필요)

## 4. 이 프로젝트 로컬 개발 셋업

1. 루트 `.env.example` 복사해서 `.env` 생성 (`.env`는 `.gitignore` 처리됨)
2. Supabase Connect 팝업 → **Session pooler** URI 복사
3. `.env`의 `DATABASE_URL=`에 붙여넣고 `[YOUR-PASSWORD]`를 실제 비번으로 교체
4. 비번에 특수문자 있으면 **URL 인코딩**: `#`→`%23`, `@`→`%40`, `!`→`%21` 등
5. `pnpm --filter api db:migrate` — 부기 테이블(`drizzle.__drizzle_migrations`) 생성돼야 함

## 5. Drizzle 마이그레이션 흐름

```bash
# 1) 스키마 파일 수정: apps/api/src/db/schema/*.ts

# 2) SQL 파일 자동 생성 (apps/api/drizzle/ 에 XXXX_xxx.sql)
pnpm --filter api db:generate

# 3) 생성된 SQL 훑어보고 이상 없으면 DB에 적용
pnpm --filter api db:migrate

# 4) DB 상태 GUI로 보고 싶으면
pnpm --filter api db:studio
```

**주의**:
- 마이그레이션 파일은 **커밋한다**. 팀/기기 간 상태 동기화 용도.
- 손으로 SQL을 DB에 직접 실행하지 말 것 (CLAUDE.md 규칙 4).
- 이미 적용된 마이그레이션 SQL은 절대 편집하지 말 것 → 새 마이그레이션을 하나 더 만들어서 정정.

## 6. Supabase Studio (SQL/데이터 확인)

Dashboard 좌측 사이드바:
- **Table Editor**: 테이블 데이터 CRUD (엑셀 느낌)
- **SQL Editor**: 임시 SQL 실행 (스키마 변경 말고 조회용으로만!)
- **Database → Tables**: 스키마 구조 훑기
- **Database → Schema Visualizer**: ERD 자동 그림

## 7. 자주 만나는 오류

| 증상 | 원인 | 해결 |
|---|---|---|
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | Direct 문자열 사용, IPv6 없음 | Session pooler로 교체 |
| `password authentication failed for user "postgres"` | Session pooler인데 유저를 `postgres`로만 씀 | 유저를 `postgres.<project-ref>`로 |
| `password authentication failed` (유저는 맞음) | 비번 오타, 특수문자 URL 인코딩 누락 | 비번 재확인/인코딩 |
| `connection terminated unexpectedly` | 무료 티어 프로젝트가 7일 미접속으로 pause됨 | Dashboard에서 Restore |
| SSL 관련 에러 | `ssl` 옵션 미지정 | postgres 클라이언트 옵션에 `ssl: 'require'` (이미 적용됨) |

## 8. 무료 티어 제약 (기억해둘 것)

- Postgres 500MB
- 프로젝트 최대 2개
- **7일 미접속 시 자동 pause** → 대시보드에서 Restore 필요 (데이터는 유지)
- Egress 5GB/월

취준 기간 개인용으론 넉넉.

## 9. 배포 시 바꿀 것 (지금은 신경 X)

- 로컬은 Session Pooler(5432), 배포는 Transaction Pooler(6543) 권장 (Railway/Fly/Vercel Serverless 등에서)
- 배포 환경의 Secret Manager에 `DATABASE_URL` 넣기 (`.env` 파일 커밋 금지는 그대로)

## 10. 참고

- [Supabase 공식 문서](https://supabase.com/docs)
- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- 프로젝트 내부 규칙: `CLAUDE.md`
