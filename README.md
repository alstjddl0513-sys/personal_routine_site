# routine-site

취준 기간 개인 전용 루틴/커리어 트래커. 상세 기획은 `docs/개인_루틴_커리어_관리_웹사이트_기획서.pdf` 참고.

## 스택

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS v4 (`apps/web`)
- **Backend**: NestJS 11 + Drizzle ORM (`apps/api`)
- **DB**: Supabase (매니지드 PostgreSQL)
- **Monorepo**: pnpm workspaces + Turborepo
- **Deploy**: Vercel (web) + Render (api) + Supabase (db) — 절차는 `docs/deployment.md`

## 폴더 구조

```
apps/
  web/       Next.js 앱 (localhost:3000)
  api/       NestJS 앱 (localhost:3001)
packages/
  shared/    web/api 공용 타입
docs/        기획 문서
```

## 개발 환경 준비

요구 버전: Node.js 20+, pnpm 11.

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경 변수
cp .env.example .env
# .env 열어서 DATABASE_URL 등 채우기 (Supabase 대시보드 > Project Settings > Database)
```

## 실행

```bash
# web(3000) + api(3001) 동시 기동
pnpm dev

# 개별 기동
pnpm --filter web dev
pnpm --filter api dev
```

## 자주 쓰는 스크립트

```bash
pnpm build      # 전체 빌드
pnpm lint       # 전체 lint
pnpm typecheck  # 전체 타입 체크
```

## 배포

Render(API) + Vercel(Web) + Supabase 조합. 단계별 절차와 env 세팅은 `docs/deployment.md`.

## 규칙

작업 규칙은 `CLAUDE.md` 참고.
