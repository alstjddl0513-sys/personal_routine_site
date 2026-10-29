# 릴리스 (develop → main)

> **언제 보나**: develop에 쌓인 기능을 실제 사이트에 올릴 때. 매 릴리스마다.
> 처음 한 번 하는 서버 세팅은 [`deployment.md`](./deployment.md).

**목차**
- [한눈에 보기](#한눈에-보기)
- [1. 버전 올리기](#1-버전-올리기)
- [2. 릴리스 PR 병합](#2-릴리스-pr-병합)
- [3. Prod DB 마이그레이션](#3-prod-db-마이그레이션)
- [4. 배포 확인](#4-배포-확인)
- [마이그가 여러 개 쌓였을 때](#마이그가-여러-개-쌓였을-때)
- [롤백](#롤백)

---

## 한눈에 보기

```
1. 버전 올리기      chore/release-X.Y.Z 브랜치 → root package.json version → PR → develop
2. 릴리스 PR 병합   GitHub에서 develop → main PR 병합 → Vercel·Render 자동 재배포
3. Prod 마이그      새 SQL 파일이 있으면 로컬에서 prod DB에 직접 적용 (자동 아님!)
4. 확인             /health · 스모크 테스트 · 새 기능 하나 직접 조작
5. 태그             vX.Y.Z
```

**체크리스트** (복사해서 PR 본문에 붙여도 됨)
- [ ] 버전 bump PR 병합 (develop)
- [ ] develop → main PR 병합
- [ ] 이번 릴리스에 새 마이그 SQL이 있나? → 있으면 [3](#3-prod-db-마이그레이션) 진행 (적용 순서 표 확인)
- [ ] Vercel 배포 성공 (Deployments 탭 · production alias 갱신)
- [ ] Render 배포 성공 (Events 탭 · "Deploy live")
- [ ] `/health` 응답 `{ "status": "ok", "db": "up" }`
- [ ] [배포 확인](#4-배포-확인) 스모크 테스트 + 새 기능 하나 실제 조작
- [ ] 태그 `vX.Y.Z` push
- [ ] `docs/todo.md` 이번 릴리스 항목 체크

> `main`은 배포 지점이라 **직접 커밋·푸시 금지**. 항상 PR 병합으로만 갱신.

---

## 1. 버전 올리기

1. develop에서 `chore/release-X.Y.Z` 브랜치
2. root `package.json`의 `version`만 수정 (설정 페이지 하단 버전 표시가 이 값)
3. PR → develop 병합

## 2. 릴리스 PR 병합

1. GitHub에서 **develop → main** PR 생성 · 병합
2. 병합 순간 자동 재배포 시작 — Vercel 약 1분, Render 약 2~5분

**마이그와의 순서**: 새 마이그가 있으면 아래 표대로 PR 병합 **전/후**를 정한다.

| 마이그 종류 | 예시 | 언제 적용 |
|--|--|--|
| 추가형 (additive) | nullable 컬럼 · 새 테이블 · 인덱스 | **코드 배포 전** — 새 코드가 새 컬럼을 읽음 |
| 파괴형 (destructive) | 컬럼/테이블 drop · NOT NULL 추가 | **코드 배포 후** — 옛 코드가 아직 참조 중 |
| 중립 | UNIQUE 해제 · 코드와 함께 바뀌는 rename | 아무 때나 (병합 직후가 편함) |

## 3. Prod DB 마이그레이션

Render는 마이그를 돌리지 않는다. **로컬에서 prod DB에 직접** 적용한다.

**시작 전**
- [ ] `apps/api/drizzle/`에 이번 릴리스로 새로 들어온 SQL이 있다 (없으면 이 단계 skip)
- [ ] 미적용 파일이 **하나뿐**이다 → 여러 개면 [마이그가 여러 개 쌓였을 때](#마이그가-여러-개-쌓였을-때) 먼저
- [ ] Supabase 대시보드에 **prod 프로젝트**로 들어와 있다 (로컬 dev 프로젝트와 별도)
- [ ] 파괴형이면 SQL Editor에서 백업 먼저

**① Prod 연결 문자열 복사**
Supabase 대시보드 → prod 프로젝트 → 상단 **Connect** → **Session pooler** (포트 5432).
Transaction pooler(6543)는 마이그에 부적합, Direct(`db.<ref>.supabase.co`)는 IPv6 전용이라 국내에서 DNS 실패.

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

**② REF 크로스체크 (필수)**
연결 문자열의 `postgres.<REF>`와 열어둔 대시보드 URL의 `dashboard/project/<REF>/`가 **한 글자도 안 틀리고 같아야** 한다.
dev·prod REF가 둘 다 무작위 문자열이라 `l`↔`il` 같은 한 글자 차이를 놓치기 쉽다.

**③ 적용 (PowerShell, repo 루트)**

```powershell
# 이 창에서만 유효한 env (.env 파일은 안 건드림)
$env:DATABASE_URL = "postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"

pnpm.cmd --filter api db:migrate
# "Running migrations..." → "Migrations applied." 가 뜨면 성공

# 정리 — 안 하면 다음 명령이 prod DB를 건드림
Remove-Item env:DATABASE_URL
```

- `pnpm.ps1`은 실행 정책에 막혀서 `pnpm.cmd` 사용
- `migrate.ts`는 dotenv를 기본 모드로 읽어서, 이미 세팅된 `$env:DATABASE_URL`을 `.env` 값으로 덮지 않음

**④ 적용 확인 (두 가지 다)**
prod 대시보드 → **SQL Editor**

```sql
-- (a) Drizzle 기록이 남았나 — 최상단 created_at이 _journal.json의 이번 파일 `when`과 같아야 함
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;

-- (b) 스키마가 실제로 바뀌었나 — 예: 컬럼 추가 마이그
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '<테이블>' AND column_name = '<컬럼>';
```

(a)만 보면 "기록은 됐는데 DDL은 빠진" 상태(또는 그 반대)를 놓친다. 둘 다 확인.
기록과 DDL이 어긋났다면 → [`troubleshooting.md` 마이그 트래킹 불일치](./troubleshooting.md#prod-마이그레이션-실패-후-스키마-drizzle-트래킹-불일치).

## 4. 배포 확인

- [ ] Vercel URL → 비로그인이면 `/login`으로, 로그인하면 `/today`로 착지
- [ ] 사이드바 하단에 닉네임 · Render `/health` 응답 ok
- [ ] `/jobs` 회사 추가·편집이 새로고침 후에도 남아 있음
- [ ] `/routines` 시간블록 체크가 유지됨
- [ ] `/workouts` 세트 입력 후 blur → 새로고침해도 유지
- [ ] `/blog` RSS 새로고침 성공
- [ ] Render **Logs**에 401·5xx 없음
- [ ] DevTools Network: `/api/proxy/*`가 200이고 응답에 `Authorization` 헤더가 노출되지 않음
- [ ] 이번 릴리스의 새 기능 하나 직접 조작

---

## 마이그가 여러 개 쌓였을 때

Drizzle 마이그레이터는 미적용 파일을 한 트랜잭션으로 묶어 돌리지만, 실제로는 실패 시 **일부만 반영되고 기록은 안 남는** 상태가 생긴 적이 있다(Phase 12.4 prod).

- 원칙: **prod에 미적용 마이그를 쌓지 않는다.** 릴리스마다 적용
- 이미 쌓였다면 **파일 하나씩** 적용하고 매번 [④ 확인](#3-prod-db-마이그레이션)
- Drizzle에는 단일 파일 실행 기능이 없어 `apps/api/src/db/apply-sql-file.ts`로 우회

```powershell
# apps/api에서. Drizzle 기록을 거치지 않으므로 아래 INSERT를 직접 해야 다음 db:migrate가 이 파일을 건너뜀
pnpm.cmd exec tsx src/db/apply-sql-file.ts drizzle/0011_easy_squirrel_girl.sql
```

```sql
-- created_at = apps/api/drizzle/meta/_journal.json의 해당 파일 `when` 값
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('0011_manual_apply', 1789056982562);
```

## 롤백

- **미리 대비가 최선**: 파괴형 마이그 전에 SQL Editor로 백업(대상 테이블 `CREATE TABLE … AS SELECT`)
- Free 티어 자동 백업 7일 · PITR(시점 복구)은 Pro 전용
- 급하면 반대 SQL을 수동 실행(예: UNIQUE 해제 롤백 = `ADD CONSTRAINT … UNIQUE`). 이때 `drizzle.__drizzle_migrations`의 해당 row도 삭제해야 다음 `db:migrate`가 재시도하지 않음
- 코드만 되돌릴 땐 main에 revert PR (Render·Vercel 자동 재배포). Vercel은 Deployments에서 이전 배포로 즉시 Promote 가능
