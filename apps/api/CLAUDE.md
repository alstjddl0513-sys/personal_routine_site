# API 작업 규칙 (apps/api/**)

이 규칙은 `apps/api/**` 파일을 건드릴 때만 로드된다. 루트 `CLAUDE.md`의 세션 공통 규칙은 그대로 따른다.

## DB / 스키마 (Drizzle + Supabase)

- 스키마 변경은 반드시 Drizzle 마이그레이션 파일로 관리한다. DB를 손으로 직접 고치지 않는다.
- ERD 변경은 특히 계획을 먼저 공유하고 진행한다.
- 스키마 변경 흐름:
  1. 스키마 편집
  2. `pnpm --filter api db:generate`
  3. 생성된 SQL 사용자에게 보여주고 승인
  4. `pnpm --filter api db:migrate`

  **자동 실행 금지**.

- 로컬 dev는 Supabase **Session Pooler(port 5432)** 문자열 사용. Direct connection은 IPv6 전용이라 국내 환경에서 DNS 실패.
- **Prod 마이그은 파일 하나씩**. `db:migrate`가 여러 개 미적용을 한 번에 돌리면 실패 시 부분 반영 상태에 빠질 수 있음(Phase 12.4에서 겪음). 파일별 실행이 필요하면 `apps/api/src/db/apply-sql-file.ts` 유틸 + 수동 트래킹 INSERT. `docs/release.md` "마이그가 여러 개 쌓였을 때" · `docs/troubleshooting.md` 참고.
- **Prod 적용 후엔 기록과 스키마를 둘 다 확인** — `drizzle.__drizzle_migrations` 최신 row + `information_schema.columns`. 기록만 빠지거나 DDL만 빠진 상태가 실제로 생겼음(12.4 prod, 0029 로컬).
- **`defaults.ts`의 `DEFAULT_*`에 항목 추가하면 같은 파일의 `DEFAULTS_VERSION`을 반드시 +1**. `profiles.findMe`의 lazy sync가 이 값으로 기존 유저 backfill 여부를 판단. bump 누락 시 기존 유저는 새 시드를 못 받음. `docs/troubleshooting.md` 참고.

## 반복 CRUD 도메인

새 도메인 추가는 `.claude/skills/nestjs-crud-domain/SKILL.md`의 패턴 따름. companies / time-blocks / routine-checks / day-notes에서 4번 검증됨.
