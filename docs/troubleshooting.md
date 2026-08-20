# 삽질 로그

작업 중 만난 문제와 해결법 축적. 세션 끝날 때마다 새 항목 append. 이미 있는 항목이면 skip.

형식: **증상 한 줄** / 상황 · 원인 · 해결.

---

## pnpm / 모노레포

### `pnpm install` 실행이 PowerShell에서 차단됨
- 상황: `pnpm install` 실행 시 `pnpm.ps1 cannot be loaded because running scripts is disabled` 에러
- 원인: Windows PowerShell의 실행 정책이 서명 안 된 `.ps1` 스크립트를 막음
- 해결: `pnpm.cmd install`로 `.cmd` 래퍼 호출 (정책 자체는 안 건드림)

### pnpm 11 설치가 exit 1 (`ERR_PNPM_IGNORED_BUILDS`)
- 상황: 새 dep 설치 후 pnpm이 exit 1 리턴 → `pnpm dev`가 사전 deps 재검증에서 죽음
- 원인: pnpm 11이 검증되지 않은 postinstall 스크립트에 대해 안내성 실패를 반환. `ignoredBuiltDependencies`에 넣어도 여전히 실패 코드 반환
- 해결: `pnpm-workspace.yaml`의 `allowBuilds:`에 `<pkg>: true`로 명시 승인 (검증된 패키지만). 예: `unrs-resolver`, `esbuild`

### workspace 패키지가 앱에서 import 안 됨
- 상황: `packages/shared`의 타입을 `apps/api`에서 import했는데 모듈을 못 찾음
- 원인: 앱의 `package.json`에 `"@repo/shared": "workspace:*"` 명시 안 함 → pnpm이 심볼릭 링크 안 만듦
- 해결: 사용하는 앱의 `dependencies`에 `"@repo/xxx": "workspace:*"` 추가 후 `pnpm install`

---

## Supabase 연결

### `getaddrinfo ENOTFOUND db.<ref>.supabase.co`
- 상황: `db:migrate` 시 DNS 조회 실패
- 원인: Direct connection(`db.<ref>.supabase.co`)이 IPv6 전용 (유료 IPv4 애드온 없으면). 국내 대부분 인터넷은 IPv6 미지원
- 해결: Supabase Dashboard **Connect** → **Session pooler** URI로 교체 (`aws-0-<region>.pooler.supabase.com`, IPv4 지원)

### Session Pooler에서 `password authentication failed for user "postgres"`
- 상황: pooler 호스트는 잘 잡혔는데 인증 실패
- 원인: Session Pooler는 유저명이 `postgres.<project-ref>` 형식이어야 함 (pooler가 여러 프로젝트를 라우팅하므로 tenant 지정 필요). Direct 문자열에서 유저를 그대로 두고 호스트만 바꿨을 때 발생
- 해결: `.env`의 `DATABASE_URL` 유저 부분을 `postgres.<project-ref>`로. Supabase Connect 팝업의 pooler 문자열을 통째로 복사 후 `[YOUR-PASSWORD]`만 치환하는 게 안전

---

## NestJS

### `tsconfig.json`의 `baseUrl` deprecated 경고
- 상황: `apps/api/tsconfig.json` 열면 IDE에 `'baseUrl' 옵션은 더 이상 사용되지 않으며 TypeScript 7.0에서 작동하지 않습니다`
- 원인: NestJS CLI 기본 스캐폴드가 `baseUrl: "./"`를 넣지만, path 매핑을 안 쓰면 불필요. TS 6.5+에서 deprecated
- 해결: `baseUrl: "./"` 라인 삭제 (`ignoreDeprecations` 로 덮는 건 임시방편이라 비추)

### `DATABASE_URL is not set` — Nest 부트스트랩 전 module import 시점에 env 미로드
- 상황: `HealthController`가 `db/client`를 import → `client.ts`가 module load 시점에 `process.env.DATABASE_URL` 읽음 → 아직 `ConfigModule.forRoot`가 실행되기 전이라 undefined
- 원인: TS import는 hoisted. Nest의 ConfigModule은 `NestFactory.create()` 이후에야 .env를 로드
- 해결: `apps/api/src/bootstrap-env.ts`를 만들어 dotenv를 preload → `main.ts` 최상단에서 `import './bootstrap-env';`로 다른 import보다 먼저 실행. 이 파일은 루트 `.env`를 `resolve(process.cwd(), '../../.env')`로 지정

---

## Next.js

### `Hydration mismatch` 콘솔 에러 (layout.tsx)
- 상황: `/` 렌더 시 콘솔에 "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" (line 22, `<html>`)
- 원인: 브라우저 확장 프로그램(다크리더/문법검사/비번매니저 등)이 서버 HTML을 받은 후 하이드레이션 전에 `<html>` 태그 속성을 수정
- 해결: `<html>`에 `suppressHydrationWarning` 추가. **최상위에만** 적용 → 자식 컴포넌트의 실제 hydration 버그는 여전히 잡힘 (Next.js 공식 권장 패턴)

### `PageProps<'/jobs'>`가 typecheck에서 `does not satisfy '/'`로 실패
- 상황: 새 route 추가 후 `pnpm --filter web typecheck` 하면 `Type '"/jobs"' does not satisfy the constraint '"/"'` — 아직 `next dev`/`next build` 한 번도 안 돌린 상태
- 원인: Next 16 타입 유틸(`PageProps<T>`, `LayoutProps<T>`)이 `.next/dev/types/routes.d.ts`에 있는 route union을 참조. 이 파일은 `next dev`/`build`가 라우트 스캔해서 생성. 안 돌리면 union이 `'/'`만 포함
- 해결: 새 route 파일 만든 뒤 최소 한 번 `next dev` 띄우거나 `next build` 실행 → 이후 typecheck 통과. CI에선 typecheck 전에 `next build` 강제

### 클라이언트 필터 컴포넌트에서 URL → local input state 동기화 안 됨
- 상황: `useState(currentSearch)`로 초기화한 검색 input이, URL을 chip 클릭/뒤로가기/초기화로 외부 변경했을 때 값을 안 따라감 (표는 갱신되는데 검색창 텍스트가 stale)
- 원인: `useState` 초기화는 mount 시점 1회. URL이 바뀌어도 state는 안 흔들림. typing → URL 반영은 debounce로 도는데 URL → input 방향은 자연히 안 됨
- 해결: `lastPushedRef`로 "내가 마지막에 push한 값" 추적 → URL current 값이 lastPushed와 다르면(= 외부 변경) input state 강제 동기화. 자체 push 시엔 ref만 갱신해서 loop 방지

---

## class-validator / DTO

### `IsEnum`이 readonly 배열에서 값 목록을 비운다
- 상황: `@IsEnum(['big_tech', 'sme', ...] as const)`로 검증 걸었더니 에러 메시지가 `"type1 must be one of the following values: "` — 값 목록이 비어 있음
- 원인: class-validator의 `getValidEnumValues`가 `Object.keys(entity).filter(k => !/^\d+$/.test(k))`로 숫자 인덱스를 걸러냄. 배열은 키가 전부 숫자 인덱스이므로 필터 후 빈 배열
- 해결: enum을 객체 형태로 (`{ big_tech: 'big_tech', ... } as const`) 정의. 그럼 키가 문자열이라 필터를 통과, 메시지에 값 목록 정상 출력

### `enableImplicitConversion: true` + `@Transform` boolean이 뒤엎힌다
- 상황: 쿼리 `?isHiring=false`가 `?isHiring=true`처럼 동작. `@Transform`으로 `'false' → false` 변환 걸었는데도 무시됨
- 원인: ValidationPipe에 `transformOptions: { enableImplicitConversion: true }` 켜면 class-transformer가 declared type(`boolean`)에 맞춰 `Boolean(value)`를 적용. `Boolean('false') === true`라 `@Transform` 결과를 덮어씀
- 해결: `enableImplicitConversion` 제거. 숫자 쿼리 파라미터가 필요해지면 그때 필드별로 `@Type(() => Number)`로 명시. Boolean은 `@Transform`으로 직접 다룸

---

## Windows 개발환경

### `curl -d '{"name":"한글"}'`가 DB에 mojibake로 저장됨
- 상황: Git Bash의 curl로 한글 포함 JSON POST → DB에 `���̹�` 저장됨
- 원인: Windows curl.exe가 콘솔 코드페이지(cp949)로 body를 인코딩해서 전송. 서버는 UTF-8 가정
- 해결: 검증은 PowerShell `Invoke-RestMethod ... -Body $body -ContentType 'application/json; charset=utf-8'`로. curl 굳이 쓰려면 `--data-binary @file.json`으로 UTF-8 파일 지정

### `turbo run dev`가 `spawn UNKNOWN` (errno -4094)로 죽음
- 상황: `pnpm dev` → `Error: spawn UNKNOWN`. turbo.exe 직접 실행하면 "Device Guard 정책에 의해 차단되었습니다"
- 원인: Windows 11 Smart App Control / Device Guard가 서명 안 된 `turbo.exe`(vercel 배포) 실행 차단. Smart App Control은 개별 예외 등록 UI 없음. 끄면 재설정 못 함
- 해결: turbo 자체를 제거. 루트 `package.json` scripts를 `pnpm -r --parallel run dev` / `pnpm -r run build|lint|typecheck`로 교체. 앱 2개짜리 모노레포엔 turbo 캐시 이득 없음

### 마이그레이션 후 `applicationDeadline`이 표에 안 뜸 (저장은 됨)
- 상황: PATCH로 값 저장 → DB에 정상 저장 → GET에서 `"2026-08-25 09:00:00+00"` 반환 → 프론트가 `—`로 표시
- 원인: PostgreSQL timestamptz의 텍스트 반환 형식(공백+짧은 `+00`)이 비표준. Firefox/Safari `new Date()`가 `Invalid Date` 반환. Chrome은 관대해서 통과
- 해결: 표시 helper에서 공백→`T`, `+00`→`+00:00` 정규화 후 `new Date()`. 백엔드에서 ISO로 변환하는 대안도 있으나 프론트가 더 국지적
