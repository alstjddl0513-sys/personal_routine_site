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

### Drizzle `db.delete`가 FK-restrict를 던져도 `err.code` 매칭이 miss (23503이 catch를 통과)
- 상황: `ExercisesService.remove`가 FK-restrict(23503)를 catch에서 잡아 `ConflictException`(409)로 변환하도록 짜뒀는데, 실제 삭제 시 500이 튀어나옴 → 클라 dev overlay에 `HttpError HTTP 500`으로 노출
- 원인: postgres.js가 원본 에러를 던질 땐 `err.code`에 SQLSTATE가 top-level로 담기지만, Drizzle delete 경로에서는 wrap된 에러가 나오면서 code가 `err.cause.code`로 밀리는 케이스가 있음. `if (err.code === '23503')` 만으론 못 잡고 그대로 re-throw → NestJS 기본 500
- 해결: `pgCode(err)` 헬퍼로 `err.code || err.cause?.code` 둘 다 훑도록 방어. 이후 삭제 → 409 → 클라 `HttpError.status === 409` fallback 모달 정상 진입

### Service `insert().values({...})`가 DTO의 optional 필드를 조용히 drop
- 상황: `CreateTimeBlockDto`에 `startTime?: number` 필드 정의돼 있고 컨트롤러는 통과하는데, 실제 저장 후 DB에 startTime이 null. 매니저 UI에서 시간 넣어도 저장 안 됨
- 원인: `TimeBlocksService.create()`가 `.values({ label: dto.label, sortOrder })`로 명시 필드만 insert. `dto.startTime`이 컨트롤러까지 도달했지만 서비스 layer에서 빠짐. class-validator는 필드 검증만 하고 다음 계층으로 자동 전달 X — insert values는 개발자가 명시 스프레드해야 함
- 해결: `.values({ label, sortOrder, startTime: dto.startTime, endTime: dto.endTime })`로 확장. **신규 DTO 필드 추가 시 서비스 create/update 둘 다 확인**. 팁: `.values({ ...dto, sortOrder })` 패턴으로 스프레드해두면 재발 방지되지만 DTO에 원치 않는 필드 있을 때 위험 — trade-off 판단

---

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

### Optimistic 토글 버튼이 연타에 반응이 느려짐 (하트/채용중)
- 상황: 하트/토글 버튼을 활성→비활성 빠르게 누르면 두번째 클릭이 지연 후 반영되거나 잘못된 값으로 되돌아감
- 원인: `disabled={isPending}` + `useTransition`으로 PATCH+`router.refresh` 왕복 중 버튼이 잠김. `useEffect([value])`가 매번 prop→state 리셋해서 in-flight 중 이전 refresh 결과가 현재 optimistic 상태를 덮음
- 해결: (1) `disabled` 제거 → 항상 클릭 가능. (2) `inFlightRef` 카운터로 왕복 중일 땐 useEffect의 prop 동기화 skip → 마지막 사용자 클릭 의도 보존. router.refresh는 유지(필터가 켜져 있을 때 행이 사라지는 동작을 위해)

### Nest 핸들러가 `null` 반환하면 client의 `res.json()`이 터짐
- 상황: `/workout-sets/previous`가 이전 세션 없을 때 `null` 반환. 클라이언트에서 `SyntaxError: Unexpected end of JSON input` → 서버 컴포넌트 500
- 원인: NestJS는 handler가 `null`을 리턴하면 응답 바디를 비워버림 (Content-Length: 0). 문자열 `"null"`이 아니라서 `res.json()`이 파싱 실패
- 해결: 클라이언트에서 `res.text()`로 먼저 읽고 empty면 `null` 반환, 아니면 `JSON.parse`. 서버쪽 shape를 바꾸는 것보단 클라이언트가 방어하는 게 지역적

### 세트 값 전부 지워도 잔디에 오늘 셀이 계속 뜸
- 상황: `/workouts`에서 오늘 세트 kg/reps 다 지우고 blur → sets는 삭제 → 하지만 `/workouts/statistics` 잔디에 오늘 셀 여전히 초록
- 원인: `batchReplace`가 sets만 replace하고 `workout_sessions` row는 유지. 잔디는 세션 존재 여부만 봄. 추가로 `SetInputs.commit`이 `sig === lastSavedRef` 이면 early return이라 이미 empty였던 상태에서 다시 blur해도 API 안 부름 (재입력→재삭제로 workaround 가능)
- 해결: `batchReplace` 트랜잭션 안에서 sets 0개 + note 비어있으면 세션도 delete. commit 후 `router.refresh()`로 부모 재렌더링

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

### `@IsUrl`이 한글 쿼리스트링 채용 URL을 400으로 거부
- 상황: `/jobs` UrlPopover에서 공고 링크 저장 시 `PATCH /companies/:id` → 400 `{"message":["postingUrl must be a URL address"]}`
- 원인: class-validator `@IsUrl`이 내부적으로 validator.js `isURL()`을 그대로 씀. 옵션 기본값이 IDN을 거부해서, 잡코리아·사람인 등 쿼리스트링에 한글 파라미터가 들어간 URL이 통과 못 함
- 해결: `@Matches(/^https?:\/\/.+/i)` + `@MaxLength()`로 대체. 프론트가 이미 `new URL()` 파싱 + 프로토콜 체크로 검증하므로 서버는 프리픽스만 얕게 확인. 같은 이유로 `applicationDocUrl`, blog-sources의 `rssUrl`/`siteUrl`도 함께 완화

### PATCH 400/500 에러가 body 없이 status만 던져지면 원인 파악이 오래 걸림
- 상황: 클라이언트 콘솔에 `PATCH /companies/xxx failed: HTTP 400` 만 나오고 실제 어떤 필드가 왜 거부됐는지 안 보임 → 위 IDN 이슈 재현이 오래 걸렸음
- 원인: `patchCompany` 등 mutation 헬퍼가 `res.status`만 붙여서 throw. Nest가 응답 body에 `{"message":[...]}` 형태로 상세 메시지를 담고 있지만 안 읽음
- 해결: `!res.ok` 분기에서 `await res.text()`를 붙여 `HttpError` 메시지에 포함. dev 툴 콘솔에 서버 message 배열이 그대로 노출되어 해당 필드/규칙까지 즉시 파악 가능

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

### dev 서버 재시작해도 `EADDRINUSE :::3001`이 반복됨
- 상황: TaskStop으로 pnpm dev 프로세스 죽였는데 재시작 시 계속 포트 잡힘. `next dev`/`nest start --watch`가 여러 orphan으로 남아서 요청은 뜬금없는 낡은 dist가 처리
- 원인: Windows에서 pnpm 래퍼 프로세스를 죽여도 자식 node.exe(next/nest)는 살아남음. Node 24 + Windows 조합에서 흔함
- 해결: `netstat -ano | grep ":3001.*LISTENING"`으로 PID 찾고 `taskkill //PID <pid> //F`로 강제 종료. 여러 개면 다 죽여야 함. 그 후 `pnpm --filter <app> dev` 재기동

### 브랜치 이동 후 `pnpm typecheck`가 사라진 route validator를 참조하며 실패
- 상황: 브랜치 checkout으로 `apps/web/src/app/api/proxy/[...path]/route.ts` 가 없어졌는데 `tsc`가 `.next/types/validator.ts(...) Cannot find module '.../route.js'`로 실패
- 원인: `.next/` 캐시가 이전 브랜치의 라우트를 기준으로 생성한 validator를 남겨둠. Next 16 turbopack이 파일 삭제를 항상 감지하진 않음
- 해결: `rm -rf apps/web/.next` 후 다시 typecheck. 브랜치 자주 오갈 때 첫 typecheck에서 걸리면 이걸 의심

### Drizzle 마이그레이션 번호 충돌 (병합 대기 중 다른 PR과)
- 상황: PR A가 `0005_*.sql` 만들어놓고 대기, PR A가 병합 안 된 채로 새 브랜치에서 `db:generate` 실행 → 새 마이그레이션도 `0005_*.sql`로 생성 → 나중에 rebase하면 파일명 충돌
- 원인: drizzle-kit이 idx를 `_journal.json`의 마지막 idx+1로 결정. 병합 안 된 PR의 파일이 로컬에 없으니 같은 번호가 다시 나옴
- 해결: 병합 이후 rebase 시 잘못된 번호 파일 삭제 → `_journal.json`의 해당 entry 제거 → 로컬 스키마는 이미 최종 상태이므로 `db:generate` 재실행하면 다음 번호로 다시 생성됨(`0005_free_sphinx.sql` → `0006_busy_randall.sql` 케이스). 로컬 DB의 `__drizzle_migrations` 테이블에 옛 tag가 남을 수 있지만 idempotent라 다음 마이그레이션엔 무해

---

## Render 배포

### `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`
- 상황: Render에 `NODE_VERSION=20.x`로 배포 → Node 설치 직후 위 에러로 죽음
- 원인: `node:sqlite`는 Node 22.5+ experimental / 24 stable. monorepo 빌드에서 `pnpm install`이 Next 16 등 프론트 의존 트리 전체를 끌어오는데 그중 이 API를 요구하는 툴이 낮은 Node에서 로드됨. `NODE_VERSION=20.20.2` 같은 존재하지 않는 버전 지정도 fallback 이상하게 잡히는 원인
- 해결: `NODE_VERSION=22.11.0`(현 Active LTS) 지정 → **Clear build cache & deploy**. `22`만 넣지 말고 정확한 patch 버전으로

### `Cannot find module '/opt/render/project/src/apps/api/dist/main'`
- 상황: Render 부팅 시 `node dist/main` 실패. 로컬에선 `pnpm --filter api build`가 통과했는데 산출물이 `dist/src/main.js`에 생김
- 원인: `apps/api/drizzle.config.ts` 같은 루트 스크립트가 `tsconfig.build.json`에서 제외 안 됨 → nest build 대상에 포함 → TypeScript rootDir이 `apps/api/`로 넓어져 산출물 구조가 `dist/src/*`로 밀림
- 해결: `tsconfig.build.json`의 `exclude`에 `"drizzle.config.ts"` 추가. drizzle-kit은 자체 TS 로더를 쓰니 빌드 대상에서 빼도 db 스크립트에 영향 없음. `rm -rf apps/api/dist && pnpm --filter api build`로 `dist/main.js` 위치 확인
- 주의: fix 커밋을 main에 병합한 뒤에도 Render가 동일 에러를 뱉으면 **Manual Deploy → Clear build cache & deploy**로 다시. `nest-cli.json`의 `deleteOutDir`가 있어도 Render 워크스페이스가 이전 실패 빌드의 `dist/`를 캐시하고 새 빌드가 그 위에 얹히는 케이스가 있음

### `db:migrate`가 이미 적용된 이전 마이그레이션부터 재시도 (column already exists)
- 상황: 새 마이그레이션을 돌렸는데 그 전 마이그레이션(예: 0006)부터 재적용을 시도해 `column "xxx" already exists`로 죽음
- 원인: `drizzle.__drizzle_migrations` 테이블의 마지막 레코드 `created_at`이 현재 `_journal.json`의 `when` 값과 어긋남. 과거 어느 시점에 `db:generate`를 다시 돌리면서 journal의 `when`이 바뀌었지만 DB tracker는 옛 값 그대로. Drizzle 마이그레이터가 hash 비교 전에 `when`으로 매칭하는 로직에서 "이 마이그레이션은 안 적용됨"으로 판단
- 해결: DB tracker의 마지막 레코드 `created_at`을 journal의 `when` 값으로 UPDATE (hash가 이미 맞으면 그대로 유지). 임시 tsx 스크립트로 postgres 직접 접속해 `UPDATE drizzle.__drizzle_migrations SET created_at = <journal.when> WHERE id = <last>` 후 `db:migrate` 재실행. 스키마는 실제로 이미 최신이므로 다음 마이그레이션만 얹혀서 정상 종료. 임시 스크립트는 세션 후 삭제(커밋 X)

### 빌드 실패 `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`
- 상황: Render Web Service 첫 배포 시 pnpm install 단계에서 실패
- 원인: **Root Directory**를 `apps/api`로 지정 → 워크스페이스 의존(`"@repo/shared": "workspace:*"`)이 부모 pnpm-workspace.yaml 컨텍스트 밖이라 매칭 실패
- 해결: Root Directory를 **비워둠**(`.`)으로 설정 후 build command에서 `pnpm --filter api build`로 지정. 재배포 시 **Clear build cache & deploy**

### 클라이언트에서 API 호출 시 401
- 상황: Vercel 배포된 웹에서 데이터 로딩 실패, Network 탭에 `/api/proxy/*` → 401
- 원인: Web의 `API_ACCESS_TOKEN` env 값과 Render API의 `API_ACCESS_TOKEN` 값 불일치. `AccessTokenGuard`가 헤더 검증 실패로 401 반환
- 해결: 두 대시보드에서 정확히 같은 값인지 확인(공백·복사 실수 흔함). 한쪽 재생성 시 다른 쪽도 동시 갱신. 변경 후 Render는 자동 재배포, Vercel은 수동 재배포 필요

### 브라우저 CORS 에러 (배포 후)
- 상황: Vercel 사이트에서 fetch → 콘솔에 `blocked by CORS policy: No 'Access-Control-Allow-Origin' header`
- 원인: Render의 `CORS_ALLOWED_ORIGIN`이 아직 `*`(초기 셋업값)이거나 실제 Vercel URL과 오타. Production alias + branch alias 모두 등록 안 되면 preview에서만 CORS 실패
- 해결: Render → Environment → `CORS_ALLOWED_ORIGIN`을 실제 Vercel URL들로 comma-separated 지정 (예: `https://rally-web.vercel.app,https://rally-web-git-develop-<team>.vercel.app`). env 변경 시 Render 자동 재배포

---

## Vercel 배포

### 빌드에서 `@repo/shared`를 못 찾음
- 상황: Vercel 빌드 로그에 `Module not found: Can't resolve '@repo/shared'`
- 원인: Root Directory가 잘못 지정됐거나(`.` 대신 `apps/web`이어야 함) `pnpm-lock.yaml`이 커밋 안 됐거나. Vercel의 pnpm workspace 감지가 lockfile + root 조합에 의존
- 해결: **Root Directory**를 `apps/web`으로 세팅. `pnpm-lock.yaml`이 repo 루트에 커밋됐는지 확인. Framework preset은 Next.js 자동 감지 유지

---

## 시드 / 데이터 관리

### `db:seed` 재실행 위험 — companies 테이블을 전부 delete/reinsert
- 상황: 하체 운동 추가하려고 `db:seed`를 재실행하려 했더니, 같은 스크립트가 `companies`도 delete 후 재삽입하는 구조라 그동안 편집해온 회사 데이터(지원 상태/메모/체크 등)가 다 날아갈 뻔
- 원인: 초기 대량 시드 스크립트를 그대로 유지 중. exercises는 이후 `if empty` 조건이 붙었지만 companies는 여전히 무조건 wipe
- 해결: 재실행이 필요한 도메인은 **전용 스크립트로 분리 + upsert-if-missing**. exercises는 `db:seed:exercises` (`seed-exercises.ts`)로 분리, 이름 기준으로 신규만 insert, `sortOrder`는 기존 max+1부터 이어붙임. 새 도메인 시드 확장 시에도 같은 패턴 권장

---

## 스케줄러 (cronjob.org · 내부 cron)

### cronjob.org "Failed (output too large)"
- 상황: `POST /blog-posts/refresh` 훅 실행 결과가 "Failed" — Test run 응답에 "output too large" 문구
- 원인: cronjob.org 무료 티어는 응답 body 크기 임계값을 두고 그걸 넘으면 실행 자체를 실패로 표시. RSS refresh는 `{ processed, added, errors: [...] }` JSON을 반환하는데 errors 배열 · postgres 오류 메시지 · stack 등이 붙으면 몇 KB를 쉽게 넘김
- 해결: RSS refresh는 **서버 프로세스 안 `@nestjs/schedule` `@Cron`**으로 이관 (`BlogPostsService.scheduledRefresh`, `@Cron('0 11,23 * * *')`). cronjob.org에는 콜드 스타트 방지용 `/health` 훅 하나만 유지. 결과는 Render Logs 탭에서 확인. `deployment.md` §5 참고

### cronjob.org 훅이 알림 없이 disabled됨
- 상황: `/health` ping이 계속 되고 있다고 생각했는데 어느 순간 cronjob.org 대시보드에서 job이 disabled 상태 → 그 사이 Render가 슬립했고 첫 요청 30초 콜드 스타트 반복
- 원인: cronjob.org는 연속 실패가 일정 횟수 누적되면 job을 자동 disable. Render 콜드 스타트가 30초를 넘으면 훅의 기본 timeout(30s)에 걸려 fail로 집계됨. 이게 반복되면 disable 트리거
- 해결: **History 탭**에서 fail 이력·원인 확인. timeout을 45~60s로 올리고 재활성. Health ping은 살아 있어야 `@nestjs/schedule` 내부 cron도 슬립 창에 미스되지 않음 (내부 cron만 있고 서버가 슬립이면 그 시간대 실행 못함)

---

## Next.js 프론트

### `/workouts` 세트 입력 시 두 번째 필드 값이 씹힘
- 상황: 무게 입력 후 Tab하여 횟수 입력하는 순간 UI에서 방금 입력한 숫자가 사라짐. 무게 단독은 정상, 횟수만 씹힘
- 원인: 무게 blur → `commit` → `router.refresh()` → 서버가 새 `existingSets` 반환 → `SetInputs`의 useEffect가 rows를 `initRows`로 재초기화 → 그 사이 사용자가 다음 필드에 typing한 값이 덮어쓰기됨
- 해결: useEffect 시작에서 `rowsSignature(rows) !== lastSavedRef.current`이면 (사용자 미저장 편집 중) 재초기화 skip. 실제 서버 상태 변경(reorder, 다른 카드 save)에도 in-flight typing은 보존

### Turbopack: "next/headers를 client 번들에 include" 빌드 실패
- 상황: `pnpm --filter web build` 시 `Error: You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.` (App Router 프로젝트인데 Pages Router 언급은 오해 소지)
- 원인: `lib/api.ts`(양쪽 사용)에서 `authHeaders()` 안에 `await import('./supabase/server')`로 dynamic import를 걸었지만 Turbopack은 dynamic import까지 모듈 그래프에 포함시켜 client 번들에 `next/headers`가 딸려옴. Client Components(예: `AddCompanyButton`)가 api.ts를 import한 순간 발생
- 해결: `lib/supabase/auth-header.ts`에 `'use server'` 지시자를 붙여 Server Action으로 분리. api.ts는 Server Action reference만 import → Next가 client 번들에서 RPC 스텁으로 대체해 server-only 의존은 남지 않음. Server-side는 in-process 직접 호출로 hop 없음. Phase 12.2 참고

### 삭제한 route가 `.next/dev/types/validator.ts`에 잔재로 남아 타입 에러
- 상황: `apps/web/src/app/api/auth/login/route.ts` 파일을 지웠는데 `pnpm --filter web build` 첫 시도에서 `Cannot find module '../../../src/app/api/auth/login/route.js' or its corresponding type declarations`
- 원인: Turbopack이 이전 dev 실행 때 만든 `.next/dev/types/validator.ts` 캐시가 삭제된 route를 참조 중. Next가 타입 검증 단계에서 이 파일을 읽음
- 해결: `rm -rf apps/web/.next` 후 재빌드. 파일 삭제·이동 후 stale 타입 캐시 이슈는 같은 방법으로 해소

---

## Phase 12 인증

### /signup에서 `/api/proxy/profiles/check-nickname` 401
- 상황: /signup 닉네임 필드가 `HTTP 401`로 중복검사 실패. 백엔드 컨트롤러에 `@Public()`이 있어도.
- 원인: 요청 경로는 브라우저 → Next `proxy.ts` middleware → `/api/proxy/[...path]` Route Handler → NestJS API. Middleware가 세션 없는 `/api/*` 요청을 401 JSON으로 차단해서 NestJS의 `@Public()`은 도달 못 함
- 해결: `proxy.ts`의 `PUBLIC_PATHS`에 `/api/proxy/profiles/check-nickname` 추가. **인증 계층이 두 겹(Next middleware + NestJS Guard)이라 공용 엔드포인트는 양쪽 다 열어줘야 함**

### Prod 마이그레이션 실패 후 스키마-Drizzle 트래킹 불일치
- 상황: `db:migrate`가 여러 미적용 마이그(0010~0013)를 한 번에 돌리다 0012 `SET NOT NULL`에서 (backfill 안 된) NULL owner_id 때문에 실패. Drizzle은 전체 루프를 `session.transaction`으로 감싸지만, 결과적으로 prod엔 0011 컬럼은 반영되고 FK/트래킹은 미반영된 상태로 남음 (postgres.js의 statement별 autocommit 개입 가능성). SQL Editor로 정정 SQL 붙여넣기도 특정 라인(`routine_checks_owner_id_auth_users_id_fk` 등 긴 identifier)에서 문자 스퀴즈로 mangling
- 원인: (a) Drizzle 마이그레이터는 pending 마이그를 all-or-nothing으로 굴리는 게 이상적이지만 실제 postgres.js 상호작용에서 부분 반영이 가능. (b) 브라우저 붙여넣기가 긴 SQL의 특정 라인을 잘라내는 이슈
- 해결 흐름:
  1. 실제 스키마 상태를 `information_schema.columns` / `pg_constraint` / `drizzle.__drizzle_migrations`로 정밀 진단
  2. 부족한 조각(FK, profiles 등)을 담은 one-off `prod-recovery-*.sql` 임시 파일 작성
  3. `apps/api/src/db/apply-sql-file.ts`(신설 유틸)로 파일 통짜 전송 → 브라우저 우회
  4. Drizzle 트래킹에도 수동 INSERT (`hash`는 라벨 텍스트, `created_at`는 `_journal.json`의 `when` 값)
  5. NULL owner_id 데이터가 소량이면 backfill 대신 DELETE (prod가 사실상 비어있을 때만 안전)
  6. `db:migrate` 재실행 → 미적용 마이그(0012, 0013 등) 순차 적용
  7. 검증: 트래킹 개수 = 마이그 파일 개수, `is_nullable='NO'` 개수 = 예상치, `rowsecurity=true` 개수 = 예상치
- 재발 방지: prod 마이그 실행 전 `db:generate`로 "No schema changes" 확인, 대규모 마이그는 **파일을 하나씩** 개별 실행. deployment.md §6 참고

### RSS 수집에서 네이버 D2만 `status code 406`
- 상황: `/blog` 새로고침하면 8개 중 D2 한 개만 406으로 실패. 다른 소스는 정상
- 원인: `rss-parser` 기본이 `Accept: application/rss+xml` 헤더만 보내는데, D2 피드(`d2.atom`)는 순수 Atom이라 그 Accept로는 406 응답. Accept 헤더 아예 없거나 atom 포함하면 200
- 해결: `rss-fetcher.ts`의 Parser headers에 `Accept: application/atom+xml, application/rss+xml, application/xml;q=0.9, */*;q=0.8` 명시. 다른 Atom 전용 피드 만나도 재사용

### `Manifest: Line: 1, column: 1, Syntax error.` + 첫 렌더 느림
- 상황: 로그인 후 페이지에서 콘솔에 manifest.webmanifest Syntax error 두 번, 폰트 preload 미사용 경고. 로그인 직후 첫 렌더가 유독 느림
- 원인: `proxy.ts`의 `matcher`가 excludes `_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png`만 나열 → `/manifest.webmanifest`, `/flag-512.png`, `/icon-maskable.svg`가 미들웨어를 매번 통과. (a) 세션 없으면 `/login`으로 redirect돼 HTML이 돌아오고 브라우저가 이를 manifest로 파싱하려다 실패. (b) 세션 있어도 요청마다 `supabase.auth.getUser()` 서버 왕복이라 병렬 asset 요청 수만큼 지연 누적
- 해결: matcher 정규식을 확장자 기반으로 넓혀서 정적 파일 통째로 제외: `/((?!_next/static|_next/image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml)$).*)`

### Modal 안의 커스텀 Select가 옵션 선택 즉시 모달을 닫음
- 상황: 회사 추가 / 운동 추가 모달에서 유형/부위 dropdown 옵션을 누르면 값 저장 없이 모달이 그대로 닫힘 → 등록 자체가 불가
- 원인: 모달이 `useOutsideClick(cardRef, ...)`로 바깥 감지를 걸어놨는데, 프로젝트의 `Select` 컴포넌트는 popover를 `createPortal(document.body)`로 렌더링. cardRef의 DOM 자식이 아니라 클릭 target이 outside로 판정 → 모달 close 트리거
- 해결: 모달 자체엔 outside 감지를 걸지 않고, dialog wrapper의 `onMouseDown`에서 `e.target === e.currentTarget`(=진짜 backdrop) 조건일 때만 닫음. Portal 안의 클릭은 currentTarget이 popover라 조건 미충족 → 모달 유지. `AddCompanyButton`, `AddExerciseButton` 참고

### `AddTimeBlockRow` Enter로 저장 시 시간블록이 두 개 생성
- 상황: `/routines`에서 "+ 블록 추가" → 이름 입력 → Enter → API 두 번 호출로 동일 label 블록 2개 등록
- 원인: `onKeyDown(Enter)` → `submit()` → 내부에서 `setEditing(false)` → input unmount → **onBlur** trigger → `submit()` 재호출. `useTransition`의 `saving` state는 React batching으로 blur 도착 시점에 아직 false일 수 있어 판정 못 함
- 해결: 별도 `submittedRef` in-flight guard. 첫 submit에서 true로 세팅해 재진입 차단, finally에서 false. useTransition state에 의존하지 않으니 batching 타이밍 무관

### Prod에 `SUPABASE_URL` env 누락으로 API 부팅 실패
- 상황: `chore(release)` 머지 → Render 재배포 즉시 `Error: SUPABASE_URL is required in production — refusing to boot with auth disabled.`로 exit 1
- 원인: Phase 12.1에서 심어둔 `bootstrap-env.ts` fail-fast. `NODE_ENV=production && !SUPABASE_URL`이면 부팅 거부. 배포 파이프라인은 코드만 옮길 뿐 env는 Render 대시보드에 손으로 등록해야 함 — 12.2/12.4 릴리스 준비하면서 이 세팅을 안 해서 발생
- 해결: Render Environment → `SUPABASE_URL = https://<ref>.supabase.co` 추가 → Manual Deploy. 동시에 Vercel도 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 세팅 필요. `.env.example`은 예시일 뿐 실제 클라우드 env는 분리 관리 — 릴리스 체크리스트에 env-diff 항목 필요. deployment.md §1/§2 참고

### 커스텀 Select 팝오버가 트리거에서 멀리 뜸 (prod-only)
- 상황: 0.4.0 배포 후 `/jobs` 표 행의 PrioritySelect·SizeSelect, 회사 추가 모달의 규모/유형 Select 등을 열면 popover가 트리거에서 크게 벗어난 위치(주로 뷰포트 상단)에 렌더링. 로컬 dev에선 재현 안 됨
- 원인 추정: `usePopoverPosition`이 `POPOVER_MAX_HEIGHT=288`을 추정 높이로 써서 `pos.top`을 계산 → 실제 popover가 훨씬 짧을 때(옵션 3~5개, 실제 높이 ~100px) "above" 배치 시 앵커 위로 큰 공백을 두고 위치. 기존 `useLayoutEffect`가 `leftPx`만 실측 보정하고 `top`은 방치. 로컬 dev 빌드에서는 timing/hydration 순서상 안 튀고 prod 빌드에서만 관측됨
- 해결: `Select.tsx`에서 popover mount 후 `getBoundingClientRect()`로 실측한 높이·너비 기준으로 top·left 둘 다 재계산. 첫 렌더는 `visibility: hidden`으로 감춰 flash 방지. `scroll`/`resize`에서도 재추적

### 커스텀 Select 열린 상태에서 화살표 키가 1칸만 내려가고 다시 올라감
- 상황: 어떤 Select든 열어놓고 ArrowDown을 연타하면 첫 press는 다음 항목으로 이동하는데 두 번째 press부터 원래 선택 위치로 되돌아옴. 그 아래로 진행이 안 됨
- 원인: 팝오버가 열려도 focus는 여전히 트리거 버튼에 남아있어 키가 눌리면 (a) `onTriggerKeyDown` — `openPopover()` → `setHighlightIdx(computeInitialHighlight())`로 리셋, (b) 같은 이벤트가 document로 bubble → 문서 keydown 리스너가 `setHighlightIdx(prev + 1)`. 같은 이벤트 배치에서 두 개의 `setHighlightIdx`가 큐잉되고 마지막 값이 이긴다는 가정이 렌더 사이 클로저 캡처 타이밍과 얽히며 실제로는 초기값 리셋이 우세해지는 케이스가 반복 발생 — 사용자 눈엔 하이라이트가 진동
- 해결: `Select.tsx`의 `onTriggerKeyDown`이 popover가 **닫혀 있을 때만** `openPopover()`를 호출하도록 조건 추가. 열려있으면 preventDefault만 하고 실제 이동/커밋은 document 리스너에 위임

### 어드민 endpoint에서 여러 클릭 이동 시 HTTP 429
- 상황: `/admin` 하위 페이지를 오가면서 UserPicker 등 열면 `GET /admin/users failed: HTTP 429`. 전역 ThrottlerGuard(60/min per IP)에 걸림
- 원인: `/admin/*`는 admin 1인만 접근하고 페이지 오가는 동안 profile fetch + admin/users fetch + UserPicker fetch가 짧은 시간에 누적. 다른 API 호출과 합쳐 IP 기준 60/min 임계 초과
- 해결: `AdminController`에 `@SkipThrottle()` 클래스 데코 부착 (AdminGuard로 접근 이미 통제됨). 추가로 `UserPickerModal`이 모듈 레벨 캐시(`cachedUsers` + `inFlight`)로 여닫기마다 재fetch 방지

### Drizzle `sql\`\`` 안 correlated subquery가 항상 빈 결과
- 상황: `announcements/unread` 서비스에서 `sql\`NOT EXISTS (SELECT 1 FROM ${announcementReads} r WHERE r.announcement_id = ${announcements.id})\``로 짜니 조건 만족하는 row가 있어도 항상 `[]` 반환
- 원인 추정: sql 템플릿에서 테이블 참조(`${announcementTargets}`)와 outer query 컬럼(`${announcements.id}`) 그리고 파라미터(`${userId}`)가 뒤섞이면 Drizzle이 correlated subquery로 안전히 렌더링한다는 보장이 없음. 생성 SQL 뜯어보기 전엔 원인 특정 어려움
- 해결: 서비스를 앱-레벨 필터로 재작성 (1) 활성+기간 매치 후보 fetch (2) 이 사용자의 read set fetch (3) targets 배치 조회 → Map (4) 앱 레벨에서 필터. 초기 유저 수 작아 오버헤드 미미하고 로직이 눈에 보여 디버깅 쉬움

### 로그아웃/재로그인 시 브라우저 알림 이력이 계정 간 섞임
- 상황: 계정 A가 알림 몇 개 받은 뒤 로그아웃 → 계정 B로 로그인 → NotifBell 드로어에 A의 알림 이력이 그대로 보임
- 원인: `notif-log.ts`가 localStorage 단일 키(`rally.notif.log`)를 사용. origin 공유라 auth 세션 무관하게 유지
- 해결: `KEY_USER_ID`(`rally.notif.log.user-id`) 마커 추가 + `ensureLogScope(currentUserId)` — 이전 마커와 다르면 log/last-read 청소하고 새 마커 저장. 같은 계정 재로그인이면 no-op라 이력 유지. `NotifAuthSync`가 `SIGNED_IN`/`INITIAL_SESSION`/`TOKEN_REFRESHED` 이벤트에서 호출. `SIGNED_OUT`엔 log 유지(다음 계정 로그인 시 자동 정리)

### 마감 알림이 하루 중 나중에 추가한 회사를 놓침
- 상황: 오전에 D-1 회사 5곳 알림 발송됨 → 오후에 새 회사 D-1으로 추가 → 새로고침해도 알림 안 옴
- 원인: `wasFiredToday(daysLeft)` 마커가 daysLeft 단위 boolean이라 오늘 이 daysLeft에서 한 번이라도 발송되면 무조건 skip
- 해결: 마커 포맷을 `{ date: YYYY-MM-DD, ids: string[] }` JSON으로 변경. `getFiredIdsToday(daysLeft)`가 Set 반환 → DeadlineNotifier가 `all.filter(i => !alreadyFired.has(i.id))`로 새 회사만 발송. `addFiredIdsToday`가 union으로 마커 업데이트. 옛 date-string 포맷도 오늘 날짜면 all-fired로 하위 호환
