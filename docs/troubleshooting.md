# 삽질 로그

작업 중 만난 문제와 해결법. 세션 끝날 때마다 새 항목 append. 이미 있는 항목이면 skip.

**형식**: **증상 한 줄** / 상황 · 원인 · 해결.

**최상위 분류**: [개발](#개발) (로컬 dev · 코드) / [배포](#배포) (prod · 인프라 · 외부 서비스).

---

# 개발

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

## Supabase 연결 (로컬 dev 세팅)

### `getaddrinfo ENOTFOUND db.<ref>.supabase.co`
- 상황: `db:migrate` 시 DNS 조회 실패
- 원인: Direct connection(`db.<ref>.supabase.co`)이 IPv6 전용 (유료 IPv4 애드온 없으면). 국내 대부분 인터넷은 IPv6 미지원
- 해결: Supabase Dashboard **Connect** → **Session pooler** URI로 교체 (`aws-0-<region>.pooler.supabase.com`, IPv4 지원)

### Session Pooler에서 `password authentication failed for user "postgres"`
- 상황: pooler 호스트는 잘 잡혔는데 인증 실패
- 원인: Session Pooler는 유저명이 `postgres.<project-ref>` 형식이어야 함 (pooler가 여러 프로젝트를 라우팅하므로 tenant 지정 필요)
- 해결: `.env`의 `DATABASE_URL` 유저 부분을 `postgres.<project-ref>`로. Supabase Connect 팝업의 pooler 문자열을 통째로 복사 후 `[YOUR-PASSWORD]`만 치환하는 게 안전

## NestJS

### `tsconfig.json`의 `baseUrl` deprecated 경고
- 상황: `apps/api/tsconfig.json` 열면 IDE에 `'baseUrl' 옵션은 더 이상 사용되지 않으며 TypeScript 7.0에서 작동하지 않습니다`
- 원인: NestJS CLI 기본 스캐폴드가 `baseUrl: "./"`를 넣지만, path 매핑을 안 쓰면 불필요. TS 6.5+에서 deprecated
- 해결: `baseUrl: "./"` 라인 삭제 (`ignoreDeprecations` 로 덮는 건 임시방편이라 비추)

### Drizzle `db.delete`가 FK-restrict를 던져도 `err.code` 매칭이 miss (23503이 catch를 통과)
- 상황: `ExercisesService.remove`가 FK-restrict(23503)를 catch에서 잡아 `ConflictException`(409)로 변환하도록 짜뒀는데, 실제 삭제 시 500이 튀어나옴
- 원인: postgres.js가 원본 에러를 던질 땐 `err.code`에 SQLSTATE가 top-level로 담기지만, Drizzle delete 경로에서는 wrap된 에러가 `err.cause.code`로 밀리는 케이스
- 해결: `pgCode(err)` 헬퍼로 `err.code || err.cause?.code` 둘 다 훑도록 방어

### Service `insert().values({...})`가 DTO의 optional 필드를 조용히 drop
- 상황: `CreateTimeBlockDto`에 `startTime?: number` 필드 정의돼 있고 컨트롤러는 통과하는데, 실제 저장 후 DB에 startTime이 null
- 원인: 서비스가 `.values({ label: dto.label, sortOrder })`로 명시 필드만 insert. class-validator는 필드 검증만 하고 다음 계층으로 자동 전달 X — insert values는 개발자가 명시 스프레드해야 함
- 해결: `.values({ label, sortOrder, startTime: dto.startTime, endTime: dto.endTime })`로 확장. **신규 DTO 필드 추가 시 서비스 create/update 둘 다 확인**

### `DATABASE_URL is not set` — Nest 부트스트랩 전 module import 시점에 env 미로드
- 상황: `HealthController`가 `db/client`를 import → `client.ts`가 module load 시점에 `process.env.DATABASE_URL` 읽음 → 아직 `ConfigModule.forRoot`가 실행되기 전이라 undefined
- 원인: TS import는 hoisted. Nest의 ConfigModule은 `NestFactory.create()` 이후에야 .env를 로드
- 해결: `apps/api/src/bootstrap-env.ts`를 만들어 dotenv를 preload → `main.ts` 최상단에서 `import './bootstrap-env';`로 다른 import보다 먼저 실행

### Drizzle `sql\`\`` 안 correlated subquery가 항상 빈 결과
- 상황: `announcements/unread` 서비스에서 `sql\`NOT EXISTS (SELECT 1 FROM ${announcementReads} r WHERE r.announcement_id = ${announcements.id})\`` 결과가 항상 `[]`
- 원인 추정: sql 템플릿에서 테이블 참조와 outer query 컬럼과 파라미터가 뒤섞이면 Drizzle이 correlated subquery로 안전히 렌더링한다는 보장이 없음
- 해결: 서비스를 앱-레벨 필터로 재작성. 초기 유저 수 작아 오버헤드 미미하고 로직이 눈에 보여 디버깅 쉬움

### 어드민 endpoint에서 여러 클릭 이동 시 HTTP 429
- 상황: `/admin` 하위 페이지를 오가면서 UserPicker 등 열면 `GET /admin/users failed: HTTP 429` (전역 ThrottlerGuard 60/min per IP)
- 원인: `/admin/*`는 admin 1인만 접근하고 페이지 오가는 동안 profile fetch + admin/users fetch + UserPicker fetch가 짧은 시간에 누적
- 해결: `AdminController`에 `@SkipThrottle()` 클래스 데코 부착 (AdminGuard로 접근 이미 통제됨). `UserPickerModal`에 모듈 레벨 캐시로 여닫기마다 재fetch 방지

### Drizzle 마이그레이션 번호 충돌 (병합 대기 중 다른 PR과)
- 상황: PR A가 `0005_*.sql` 만들어놓고 대기, 새 브랜치에서 `db:generate` 실행 → 새 마이그레이션도 `0005_*.sql`로 생성 → 나중에 rebase 시 충돌
- 원인: drizzle-kit이 idx를 `_journal.json`의 마지막 idx+1로 결정. 병합 안 된 PR의 파일이 로컬에 없으니 같은 번호가 다시 나옴
- 해결: 병합 이후 rebase 시 잘못된 번호 파일 삭제 → `_journal.json`의 해당 entry 제거 → `db:generate` 재실행하면 다음 번호로 다시 생성됨

## class-validator / DTO

### `IsEnum`이 readonly 배열에서 값 목록을 비운다
- 상황: `@IsEnum(['big_tech', 'sme', ...] as const)`로 검증 걸었더니 에러 메시지가 값 목록이 비어 있음
- 원인: class-validator의 `getValidEnumValues`가 숫자 인덱스를 걸러내는데, 배열은 키가 전부 숫자 인덱스라 필터 후 빈 배열
- 해결: enum을 객체 형태로 (`{ big_tech: 'big_tech', ... } as const`) 정의

### `enableImplicitConversion: true` + `@Transform` boolean이 뒤엎힌다
- 상황: 쿼리 `?isHiring=false`가 `?isHiring=true`처럼 동작. `@Transform`으로 `'false' → false` 변환 걸었는데도 무시됨
- 원인: `transformOptions: { enableImplicitConversion: true }`가 declared type(`boolean`)에 맞춰 `Boolean(value)`를 적용. `Boolean('false') === true`
- 해결: `enableImplicitConversion` 제거. 숫자 쿼리는 필드별 `@Type(() => Number)`로 명시. Boolean은 `@Transform`으로 직접 다룸

### `@IsUrl`이 한글 쿼리스트링 채용 URL을 400으로 거부
- 상황: `/jobs` UrlPopover에서 공고 링크 저장 시 400 `postingUrl must be a URL address`
- 원인: class-validator `@IsUrl`이 validator.js `isURL()`을 그대로 씀. 기본값이 IDN 거부라 잡코리아·사람인 등 한글 파라미터 URL이 통과 못 함
- 해결: `@Matches(/^https?:\/\/.+/i)` + `@MaxLength()`로 대체. 프론트가 이미 `new URL()` 검증하므로 서버는 얕게

### PATCH 400/500 에러가 body 없이 status만 던져지면 원인 파악이 오래 걸림
- 상황: 클라이언트 콘솔에 `PATCH /companies/xxx failed: HTTP 400`만 나오고 어떤 필드가 왜 거부됐는지 안 보임
- 원인: mutation 헬퍼가 `res.status`만 붙여서 throw. Nest 응답 body의 `{"message":[...]}`를 안 읽음
- 해결: `!res.ok` 분기에서 `await res.text()`를 붙여 `HttpError` 메시지에 포함

## Next.js 프론트

### `Hydration mismatch` 콘솔 에러 (layout.tsx)
- 상황: `/` 렌더 시 콘솔에 "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" (line 22, `<html>`)
- 원인: 브라우저 확장 프로그램이 서버 HTML을 받은 후 하이드레이션 전에 `<html>` 태그 속성을 수정
- 해결: `<html>`에 `suppressHydrationWarning` 추가. 최상위에만 적용

### `PageProps<'/jobs'>`가 typecheck에서 `does not satisfy '/'`로 실패
- 상황: 새 route 추가 후 typecheck 하면 `Type '"/jobs"' does not satisfy the constraint '"/"'`
- 원인: Next 16 `PageProps<T>` 유틸이 `.next/dev/types/routes.d.ts` union을 참조. `next dev`/`build` 안 돌리면 union이 `'/'`만 포함
- 해결: 새 route 파일 만든 뒤 최소 한 번 `next dev` 띄우거나 `next build` 실행

### 삭제한 route가 `.next/dev/types/validator.ts`에 잔재로 남아 타입 에러
- 상황: `apps/web/src/app/api/auth/login/route.ts` 지웠는데 `Cannot find module '.../route.js'`
- 원인: Turbopack이 이전 dev 실행 때 만든 `.next/dev/types/validator.ts` 캐시가 삭제된 route 참조
- 해결: `rm -rf apps/web/.next` 후 재빌드

### 브랜치 이동 후 `pnpm typecheck`가 사라진 route validator를 참조하며 실패
- 상황: 브랜치 checkout으로 route 파일 없어졌는데 `.next/types/validator.ts` 참조 실패
- 원인: `.next/` 캐시가 이전 브랜치의 라우트 기준 validator를 남겨둠
- 해결: `rm -rf apps/web/.next` 후 다시 typecheck. 브랜치 자주 오갈 때 첫 typecheck에서 걸리면 의심

### Turbopack: "next/headers를 client 번들에 include" 빌드 실패
- 상황: `pnpm --filter web build` 시 `next/headers` 관련 에러 (App Router인데 Pages Router 언급은 오해 소지)
- 원인: `lib/api.ts`의 `authHeaders()`에 dynamic import를 걸었지만 Turbopack이 dynamic import까지 모듈 그래프에 포함 → client 번들에 `next/headers` 딸려옴
- 해결: `lib/supabase/auth-header.ts`에 `'use server'` 지시자 붙여 Server Action으로 분리. api.ts는 Server Action reference만 import. Phase 12.2 참고

### Optimistic 토글 버튼이 연타에 반응이 느려짐
- 상황: 하트/토글 버튼을 빠르게 누르면 두번째 클릭이 지연되거나 잘못된 값으로 되돌아감
- 원인: `disabled={isPending}` + `useTransition`으로 PATCH+`router.refresh` 왕복 중 버튼이 잠김. `useEffect([value])`가 매번 prop→state 리셋
- 해결: `disabled` 제거 + `inFlightRef` 카운터로 왕복 중일 땐 useEffect의 prop 동기화 skip

### Nest 핸들러가 `null` 반환하면 client의 `res.json()`이 터짐
- 상황: `/workout-sets/previous`가 이전 세션 없을 때 `null` 반환 → 클라 `SyntaxError: Unexpected end of JSON input`
- 원인: NestJS는 handler가 `null`을 리턴하면 응답 바디를 비워버림 (Content-Length: 0). `res.json()`이 파싱 실패
- 해결: 클라에서 `res.text()`로 먼저 읽고 empty면 `null` 반환

### 세트 값 전부 지워도 잔디에 오늘 셀이 계속 뜸
- 상황: `/workouts`에서 오늘 세트 다 지우고 blur → sets는 삭제 → 잔디에 오늘 셀 여전히 초록
- 원인: `batchReplace`가 sets만 replace하고 `workout_sessions` row는 유지. 잔디는 세션 존재 여부만 봄
- 해결: `batchReplace` 트랜잭션 안에서 sets 0개 + note 비어있으면 세션도 delete. commit 후 `router.refresh()`

### 클라이언트 필터 컴포넌트에서 URL → local input state 동기화 안 됨
- 상황: `useState(currentSearch)`로 초기화한 검색 input이, URL을 chip 클릭/뒤로가기로 외부 변경했을 때 값을 안 따라감
- 원인: `useState` 초기화는 mount 1회. URL이 바뀌어도 state는 안 흔들림
- 해결: `lastPushedRef`로 "내가 마지막에 push한 값" 추적 → URL current 값이 lastPushed와 다르면 input state 강제 동기화

### `/workouts` 세트 입력 시 두 번째 필드 값이 씹힘
- 상황: 무게 입력 후 Tab하여 횟수 입력하는 순간 UI에서 방금 입력한 숫자가 사라짐
- 원인: 무게 blur → `commit` → `router.refresh()` → 서버가 새 `existingSets` 반환 → useEffect가 rows를 `initRows`로 재초기화 → 그 사이 사용자가 다음 필드에 typing한 값이 덮어쓰기됨
- 해결: useEffect 시작에서 `rowsSignature(rows) !== lastSavedRef.current`이면 재초기화 skip

### 소프트 네비게이션 후 클라이언트 shadow state가 이전 값 그대로 (LearnCard 별표)
- 상황: `/learn/review`에서 `[별표]` toggle 진입 시 카드의 ★가 첫 렌더에서 빈 ☆로 뜨고, F5 새로고침해야 채워짐. 카테고리 chip 변경도 같은 패턴
- 원인: `<Link>`/`router.push`는 soft navigation이라 서버 컴포넌트만 재렌더, 하위 클라이언트 컴포넌트 인스턴스는 재사용됨. `useState(() => ...)` 초기값은 첫 마운트에만 계산되므로 새 props가 와도 shadow는 이전 값 그대로
- 해결: 부모에서 `key={mode}:${categories}` 같은 네비 파라미터 조합을 걸어 재마운트 강제

### Modal 안의 커스텀 Select가 옵션 선택 즉시 모달을 닫음
- 상황: 회사 추가 / 운동 추가 모달에서 dropdown 옵션을 누르면 값 저장 없이 모달이 닫힘
- 원인: 모달이 `useOutsideClick`으로 바깥 감지 → 프로젝트의 `Select` 컴포넌트는 popover를 `createPortal(document.body)`로 렌더링. cardRef의 DOM 자식이 아니라 outside로 판정
- 해결: dialog wrapper의 `onMouseDown`에서 `e.target === e.currentTarget`(=진짜 backdrop) 조건일 때만 닫음

### `AddTimeBlockRow` Enter로 저장 시 시간블록이 두 개 생성
- 상황: `/routines`에서 "+ 블록 추가" → 이름 입력 → Enter → API 두 번 호출로 동일 label 2개 등록
- 원인: `onKeyDown(Enter)` → `submit()` → `setEditing(false)` → input unmount → onBlur trigger → `submit()` 재호출
- 해결: 별도 `submittedRef` in-flight guard. 첫 submit에서 true로 세팅해 재진입 차단

### 커스텀 Select 팝오버가 트리거에서 멀리 뜸 (prod-only)
- 상황: `/jobs` 표 행의 Select를 열면 popover가 트리거에서 벗어난 위치(주로 뷰포트 상단)에 렌더링. 로컬 dev에선 재현 안 됨
- 원인 추정: `usePopoverPosition`이 `POPOVER_MAX_HEIGHT=288` 추정값으로 `pos.top` 계산. 실제 popover가 훨씬 짧을 때 "above" 배치 시 앵커 위로 큰 공백. `useLayoutEffect`가 `leftPx`만 실측 보정하고 `top`은 방치
- 해결: `Select.tsx`에서 popover mount 후 `getBoundingClientRect()`로 실측한 높이·너비 기준으로 top·left 둘 다 재계산. 첫 렌더는 `visibility: hidden`으로 flash 방지

### 커스텀 Select 열린 상태에서 화살표 키가 1칸만 내려가고 다시 올라감
- 상황: Select 열어놓고 ArrowDown 연타하면 첫 press는 이동하는데 두 번째부터 원래 위치로 되돌아옴
- 원인: 팝오버가 열려도 focus는 트리거 버튼에 남아있음. 키가 눌리면 `onTriggerKeyDown`이 `openPopover()` → `setHighlightIdx(computeInitialHighlight())`로 리셋 + 같은 이벤트가 document에 bubble → 리스너가 `prev + 1`. 두 setState가 큐잉되며 리셋이 우세
- 해결: `onTriggerKeyDown`이 popover가 **닫혀 있을 때만** `openPopover()` 호출. 열려있으면 preventDefault만 하고 이동은 document 리스너에 위임

### 로그아웃/재로그인 시 브라우저 알림 이력이 계정 간 섞임
- 상황: 계정 A → 로그아웃 → 계정 B 로그인 → NotifBell 드로어에 A의 이력이 그대로
- 원인: `notif-log.ts`가 localStorage 단일 키(`rally.notif.log`)를 사용. auth 세션 무관하게 유지
- 해결: `KEY_USER_ID` 마커 추가 + `ensureLogScope(currentUserId)` — 이전 마커와 다르면 청소. `NotifAuthSync`가 `SIGNED_IN`/`INITIAL_SESSION`/`TOKEN_REFRESHED`에서 호출

### 마감 알림이 하루 중 나중에 추가한 회사를 놓침
- 상황: 오전에 D-1 알림 5곳 발송 → 오후에 새 회사 D-1으로 추가 → 새로고침해도 알림 안 옴
- 원인: `wasFiredToday(daysLeft)` 마커가 daysLeft 단위 boolean이라 오늘 한 번이라도 발송되면 무조건 skip
- 해결: 마커 포맷을 `{ date, ids: string[] }` JSON으로 변경. `getFiredIdsToday(daysLeft)`가 Set 반환 → 새 회사만 발송

### `Manifest: Line: 1, column: 1, Syntax error.` + 첫 렌더 느림
- 상황: 로그인 후 페이지에서 콘솔에 manifest.webmanifest Syntax error 두 번. 로그인 직후 첫 렌더 유독 느림
- 원인: `proxy.ts`의 `matcher`가 excludes에 `.webmanifest`·`.png`·`.svg` 등 정적 파일 제외 누락 → 세션 없으면 `/login`으로 redirect돼 HTML이 돌아오고 브라우저가 이를 manifest로 파싱하려다 실패. 세션 있어도 요청마다 `getUser()` 서버 왕복이 병렬 asset 요청 수만큼 지연 누적
- 해결: matcher 정규식을 확장자 기반으로 넓혀서 정적 파일 통째로 제외: `/((?!_next/static|_next/image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml)$).*)`

### /signup에서 `/api/proxy/profiles/check-nickname` 401
- 상황: /signup 닉네임 필드가 401로 중복검사 실패. 백엔드에 `@Public()`이 있어도
- 원인: 요청 경로는 브라우저 → Next `proxy.ts` middleware → `/api/proxy/[...path]` → NestJS. Middleware가 세션 없는 `/api/*` 요청을 401로 차단해서 NestJS의 `@Public()`은 도달 못 함
- 해결: `proxy.ts`의 `PUBLIC_PATHS`에 `/api/proxy/profiles/check-nickname` 추가. **인증이 두 겹(Next middleware + NestJS Guard)이라 공용 엔드포인트는 양쪽 다 열어야 함**

## Windows 개발환경

### `curl -d '{"name":"한글"}'`가 DB에 mojibake로 저장됨
- 상황: Git Bash curl로 한글 JSON POST → DB에 `���̹�` 저장
- 원인: Windows curl.exe가 콘솔 코드페이지(cp949)로 body 인코딩. 서버는 UTF-8 가정
- 해결: PowerShell `Invoke-RestMethod ... -Body $body -ContentType 'application/json; charset=utf-8'`로. curl 쓰려면 `--data-binary @file.json`

### `turbo run dev`가 `spawn UNKNOWN` (errno -4094)로 죽음
- 상황: `pnpm dev` → `Error: spawn UNKNOWN`
- 원인: Windows 11 Smart App Control / Device Guard가 서명 안 된 `turbo.exe` 차단
- 해결: turbo 자체 제거. 루트 `package.json` scripts를 `pnpm -r --parallel run dev`로 교체. 앱 2개짜리 모노레포엔 turbo 캐시 이득 없음

### `applicationDeadline`이 표에 안 뜸 (Firefox/Safari, 저장은 됨)
- 상황: PATCH로 값 저장 → GET에서 `"2026-08-25 09:00:00+00"` 반환 → 프론트가 `—`로 표시. Chrome은 정상
- 원인: PostgreSQL timestamptz의 텍스트 반환 형식(공백+짧은 `+00`)이 비표준. Firefox/Safari `new Date()`가 `Invalid Date`
- 해결: 표시 helper에서 공백→`T`, `+00`→`+00:00` 정규화 후 `new Date()`

### dev 서버 재시작해도 `EADDRINUSE :::3001`이 반복됨
- 상황: 프로세스 죽였는데 재시작 시 계속 포트 잡힘
- 원인: Windows에서 pnpm 래퍼를 죽여도 자식 node.exe가 살아남음
- 해결: `netstat -ano | grep ":3001.*LISTENING"`으로 PID 찾고 `taskkill //PID <pid> //F`

## 프론트 UX/CSS

### 모바일에서 한글 안내 문구가 글자 단위로 쪼개짐
- 상황: 좁은 화면에서 한글 어절 끝에서 글자 사이 개행 ("버튼" → "버\n튼")
- 원인: CSS 기본 `word-break: normal`은 CJK 사이라면 어디서든 개행 허용
- 해결: `globals.css`의 `body`에 `word-break: keep-all; overflow-wrap: break-word;`

### 모바일에서 관리자 페이지 진입 경로 부재
- 상황: 사이드바가 `hidden md:flex`로 데스크톱 전용이라 모바일에선 관리자 링크 사라짐
- 원인: 다인화 후에도 어드민 진입점을 사이드바만 두었음. BottomNav엔 관리자 슬롯 없음
- 해결: `/settings` 상단에 SSR 프로필 카드(닉네임 + isAdmin일 때 관리자 링크). 데스크톱은 `md:hidden`으로 중복 방지

### 편집·리스트 행이 좁은 화면에서 뭉개짐
- 상황: `BlogSourcesManager`·`ExercisesManager` 등 한 줄에 chevron + name + URL/뱃지 + 버튼 여러 개인 flex 행이 모바일에서 겹치거나 밖으로 밀림
- 원인: (1) `truncate` 걸린 자식의 조상 flex에 `min-w-0` 없어 shrink 안 됨, (2) 편집 상태의 고정폭(`w-64`), (3) wrap 미허용
- 해결: 조상 flex에 `min-w-0` 추가, 고정폭 제거, 필요시 `flex-wrap`

## 설계 판단 (Advisor 경고 무시 등)

### Supabase Security Advisor: `announcement_targets` "RLS Enabled No Policy"
- 상황: Advisors → Security 탭에 Info 1건. `public.announcement_targets`에 RLS 켜져있는데 정책 0개
- 원인: 이 테이블은 **설계상 authenticated에게 SELECT조차 열지 않음** (누가 어떤 공지의 대상인지 = 개인정보). 접근은 NestJS(postgres role)에서만 이뤄지고 RLS 우회
- 해결: **정책 추가 금지** — 추가하면 개인정보 노출. Advisor Info는 무시. 접근 경로 추적하려면 웹은 `grep announcementTargets apps/web/src` = 0건, API는 `admin.service.ts` / `announcements.service.ts`만

---

# 배포

## Render (API)

### `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`
- 상황: `NODE_VERSION=20.x`로 배포 → Node 설치 직후 죽음
- 원인: `node:sqlite`는 Node 22.5+ experimental / 24 stable. monorepo 의존 트리에서 이 API를 요구하는 툴이 낮은 Node에서 로드됨. `NODE_VERSION=20.20.2` 같은 존재 안 하는 버전 지정도 fallback 이상하게
- 해결: `NODE_VERSION=22.11.0`(현 Active LTS) 지정 → **Clear build cache & deploy**

### `Cannot find module '/opt/render/project/src/apps/api/dist/main'`
- 상황: Render 부팅 시 `node dist/main` 실패. 로컬에선 `pnpm --filter api build` 통과했는데 산출물이 `dist/src/main.js`
- 원인: `drizzle.config.ts` 같은 루트 스크립트가 `tsconfig.build.json`에서 제외 안 됨 → nest build 대상 포함 → rootDir이 `apps/api/`로 넓어져 산출물이 `dist/src/*`로 밀림
- 해결: `tsconfig.build.json`의 `exclude`에 `"drizzle.config.ts"` 추가. `rm -rf apps/api/dist && pnpm --filter api build`로 확인
- 주의: fix 병합 후에도 동일 에러면 **Manual Deploy → Clear build cache & deploy** (Render가 이전 실패 빌드의 `dist/`를 캐시)

### 빌드 실패 `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`
- 상황: Render 첫 배포 시 pnpm install 실패
- 원인: **Root Directory**를 `apps/api`로 지정 → 워크스페이스 의존이 부모 pnpm-workspace.yaml 컨텍스트 밖이라 매칭 실패
- 해결: Root Directory를 **비워둠**(`.`) + build command에 `pnpm --filter api build`. 재배포 시 Clear build cache

### `db:migrate`가 이미 적용된 이전 마이그부터 재시도 (column already exists)
- 상황: 새 마이그 돌렸는데 그 전 마이그(예: 0006)부터 재적용 시도 → `column "xxx" already exists`
- 원인: `drizzle.__drizzle_migrations` 테이블의 마지막 레코드 `created_at`이 현재 `_journal.json`의 `when` 값과 어긋남. 과거 어느 시점에 `db:generate` 다시 돌리면서 journal의 `when`이 바뀌었지만 DB tracker는 옛 값 그대로
- 해결: DB tracker의 마지막 레코드 `created_at`을 journal의 `when` 값으로 UPDATE. 임시 tsx 스크립트로 직접 접속해 `UPDATE drizzle.__drizzle_migrations SET created_at = <journal.when> WHERE id = <last>` 후 재실행. 임시 스크립트는 세션 후 삭제

### Prod에 `SUPABASE_URL` env 누락으로 API 부팅 실패
- 상황: 릴리스 배포 즉시 `Error: SUPABASE_URL is required in production — refusing to boot with auth disabled.`로 exit 1
- 원인: `bootstrap-env.ts` fail-fast. `NODE_ENV=production && !SUPABASE_URL`이면 부팅 거부. 배포 파이프라인은 코드만 옮기고 env는 대시보드에 손으로 등록해야 함
- 해결: Render Environment → `SUPABASE_URL = https://<ref>.supabase.co` 추가 → Manual Deploy. 동시에 Vercel도 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 세팅. 릴리스 체크리스트에 env-diff 항목 필요

### 브라우저 CORS 에러 (배포 후)
- 상황: Vercel 사이트에서 fetch → `blocked by CORS policy: No 'Access-Control-Allow-Origin' header`
- 원인: Render의 `CORS_ALLOWED_ORIGIN`이 `*` 그대로거나 실제 Vercel URL과 오타
- 해결: Render → Environment → 실제 Vercel URL들로 comma-separated (production alias + branch alias 둘 다)

## Vercel (Web)

### 빌드에서 `@repo/shared`를 못 찾음
- 상황: Vercel 빌드 로그에 `Module not found: Can't resolve '@repo/shared'`
- 원인: Root Directory 지정 오류 또는 `pnpm-lock.yaml` 미커밋
- 해결: **Root Directory**를 `apps/web`으로. `pnpm-lock.yaml`이 repo 루트에 커밋됐는지 확인

## Supabase (prod)

### Prod 마이그레이션 실패 후 스키마-Drizzle 트래킹 불일치
- 상황: `db:migrate`가 여러 미적용 마이그(0010~0013)를 한 번에 돌리다 0012 `SET NOT NULL`에서 실패. 결과적으로 prod엔 0011 컬럼은 반영되고 FK/트래킹은 미반영. SQL Editor 붙여넣기도 긴 identifier에서 mangling
- 원인: (a) Drizzle 마이그레이터는 pending을 all-or-nothing으로 굴리는 게 이상적이지만 실제 postgres.js 상호작용에서 부분 반영 가능, (b) 브라우저 붙여넣기가 긴 SQL 잘라내는 이슈
- 해결 흐름:
  1. `information_schema.columns` / `pg_constraint` / `drizzle.__drizzle_migrations`로 정밀 진단
  2. 부족한 조각을 담은 one-off `prod-recovery-*.sql` 파일 작성
  3. `apps/api/src/db/apply-sql-file.ts` 유틸로 파일 통짜 전송 (브라우저 우회)
  4. Drizzle 트래킹에 수동 INSERT (`hash`는 라벨, `created_at`는 `_journal.json`의 `when`)
  5. NULL owner_id 소량이면 backfill 대신 DELETE (prod가 사실상 비어있을 때만)
  6. `db:migrate` 재실행 → 미적용 마이그 순차 적용
  7. 검증: 트래킹 개수 · `is_nullable='NO'` · `rowsecurity=true` 예상치 대조
- 재발 방지: prod 마이그 실행 전 `db:generate`로 "No schema changes" 확인, 대규모 마이그는 **파일을 하나씩** 개별 실행. deployment.md §6 참고

### Supabase 비번 재설정 메일이 안 옴 (built-in SMTP 실질 사용 불가)
- 상황: `/forgot-password` 요청 → Auth Logs `POST /auth/v1/recover` 200 정상 → 받은편지함/스팸 어디에도 메일 없음
- 원인: Supabase가 2024~2025년 정책 변경으로 **custom SMTP 없이는 built-in email이 시간당 2통 수준 + 딜리버리 자주 실패**. `recover`는 계정 존재/발송 성공 무관하게 항상 200 반환(계정 유출 방지)이라 앱에선 에러 감지 불가
- 해결: **Resend 같은 custom SMTP 세팅이 사실상 필수**. Resend 무료 3000통/월, 발신 도메인 없으면 `onboarding@resend.dev`로 테스트 가능. Supabase Auth → Emails → SMTP Settings에 host `smtp.resend.com` · port 465 · user `resend` · password `<API key>`
- 우회(1인 앱): 재설정 flow를 login에서 노출 안 함(`/forgot-password` 코드는 남기고 진입 링크만 제거). 비번 잊으면 Supabase 콘솔 admin으로 강제 변경. 다인화 후 Resend 붙이고 링크 추가

## 시드 / 데이터 관리

### `db:seed` 재실행 위험 — 특정 테이블 전부 delete/reinsert
- 상황: 하체 운동 추가하려고 `db:seed`를 재실행하려 했더니, 같은 스크립트가 `companies`도 delete 후 재삽입 구조라 편집해온 회사 데이터가 날아갈 뻔
- 원인: 초기 대량 시드 스크립트를 그대로 유지 중. exercises는 이후 `if empty` 조건 붙었지만 companies는 여전히 무조건 wipe
- 해결: 재실행 필요한 도메인은 **전용 스크립트로 분리 + upsert-if-missing**. exercises는 `db:seed:exercises`(`seed-exercises.ts`)로 분리, 이름 기준 신규만 insert. 새 도메인 시드도 같은 패턴

## 스케줄러 (cronjob.org · 내부 cron)

### cronjob.org "Failed (output too large)"
- 상황: `POST /blog-posts/refresh` 훅이 "Failed" — Test run에 "output too large"
- 원인: cronjob.org 무료 티어가 응답 body 크기 임계값 초과 시 실행 실패로 표시. RSS refresh 응답이 몇 KB를 쉽게 넘김
- 해결: RSS refresh는 **서버 프로세스 안 `@nestjs/schedule` `@Cron`**으로 이관 (`@Cron('0 11,23 * * *')`). cronjob.org에는 콜드 스타트 방지용 `/health` 훅만. 결과는 Render Logs에서. deployment.md §5 참고

### cronjob.org 훅이 알림 없이 disabled됨
- 상황: `/health` ping 되고 있다고 생각했는데 어느 순간 disabled → Render 슬립 반복
- 원인: cronjob.org는 연속 실패 누적되면 자동 disable. Render 콜드 스타트가 timeout(30s) 넘으면 fail 집계
- 해결: **History 탭**에서 원인 확인. timeout 45~60s로 올리고 재활성. **Notifications 탭**에 fail 알림 세팅 (Failures in a row 2~3)

## RSS 수집 (외부 사이트)

### 네이버 D2만 `status code 406`
- 상황: `/blog` 새로고침하면 8개 중 D2만 406
- 원인: `rss-parser` 기본이 `Accept: application/rss+xml`만 보내는데 D2 피드(`d2.atom`)는 순수 Atom
- 해결: Parser headers에 `Accept: application/atom+xml, application/rss+xml, application/xml;q=0.9, */*;q=0.8` 명시

### 우아한형제들만 prod에서 `Status code 403` — 손절
- 상황: Render 배포 후 `techblog.woowahan.com/feed/`만 403. 로컬 dev는 정상
- 원인: 우아한형제들은 WordPress + Cloudflare. Bot Fight Mode(JS challenge)로 추정. 로컬(국내 IP)은 통과하지만 Render 미국 데이터센터 IP는 봇 취급
- 시도한 것:
  1. **v1.1.1**: User-Agent Chrome UA 스푸핑 → 실패
  2. **v1.1.2**: Sec-Fetch-*, Sec-Ch-Ua 등 Chrome 헤더 셋 추가 → 우아한형제들 여전히 403 + 오히려 다른 소스까지 실패
- 최종(v1.1.3):
  - `rss-fetcher.ts`를 v1.1.1 상태로 롤백 (UA만 스푸핑)
  - `DEFAULT_BLOG_SOURCES`에서 우아한형제들 제거 (신규 유저 안전망)
  - **prod의 기존 row는 UI(`/settings/blog-sources`)에서 수동 삭제/비활성**
- 재활성 후보: Cloudflare Workers Free로 국내 프록시. 다른 소스 여러 개가 같은 이유로 막히면 검토

## 인증 · 배포 (구식)

### 클라이언트에서 API 호출 시 401 (Phase 12 이전 · 참고용)
- 상황: Vercel 웹에서 데이터 로딩 실패, `/api/proxy/*` → 401
- 원인: Web `API_ACCESS_TOKEN` env와 Render `API_ACCESS_TOKEN` 값 불일치
- 해결: 두 대시보드에서 정확히 같은 값인지 확인. Phase 12.2 이후 이 env는 사용 X (Supabase Auth로 대체). 남아있으면 삭제
