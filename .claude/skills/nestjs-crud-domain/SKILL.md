---
name: nestjs-crud-domain
description: NestJS + Drizzle + Supabase 스택에서 새 도메인의 스키마·마이그레이션·CRUD API를 companies/time-blocks/routine-checks/day-notes와 동일한 패턴으로 스캐폴딩. 4번 반복해서 검증된 흐름. Phase 6 exercises/workout_sessions/workout_sets부터 이걸로.
---

# NestJS CRUD 도메인 추가

## 언제 사용

- 새 DB 테이블 + REST API를 추가할 때
- 기존 `companies` / `time-blocks` / `routine-checks` / `day-notes` 패턴을 그대로 반복하는 상황
- Nest + Drizzle + Supabase 스택 전제

## 절대 지켜야 할 것

- **스키마 편집 후 `db:generate`로 SQL 생성한 다음, 그 SQL을 사용자에게 보여주고 승인 받은 뒤에만 `db:migrate` 실행**. 자동 실행 절대 금지 (CLAUDE.md #4)
- 브랜치는 `feat/phase-<N>/<주제>-backend` 네이밍 (CLAUDE.md #13)
- 계획을 먼저 요약해서 사용자 승인 받은 뒤 코드 작성 (CLAUDE.md #1)

## 진행 순서 (요약)

1. 계획 요약 → 사용자 승인
2. `apps/api/src/db/schema/<domain>.ts` 편집 (또는 기존 파일에 추가)
3. `apps/api/src/db/schema/index.ts` barrel export 추가
4. `pnpm --filter api db:generate` → SQL 생성
5. **STOP** — 생성된 SQL 파일 내용을 사용자에게 보여주고 승인 요청
6. 승인 후 `pnpm --filter api db:migrate`
7. `apps/api/src/<domain>/` 폴더 생성:
   - `<domain>.module.ts`
   - `<domain>.controller.ts`
   - `<domain>.service.ts`
   - `dto/create-<entity>.dto.ts`, `dto/update-<entity>.dto.ts`, (필요시) `dto/query-*.dto.ts`
8. `apps/api/src/app.module.ts` imports에 모듈 등록
9. `pnpm --filter api typecheck` 통과 확인
10. curl/PowerShell 스모크 (create → list → patch → delete). 한글 body면 UTF-8 bytes로 (troubleshooting.md 참고)
11. `packages/shared/src/index.ts`에 도메인 타입 export (프론트에서 쓸 것이 확실할 때)

## 스키마 컨벤션 (drizzle)

```ts
import {
  boolean, date, integer, pgEnum, pgTable, smallint, text,
  timestamp, unique, uuid,
} from 'drizzle-orm/pg-core';

// enum이 필요하면 상단에 pgEnum
export const someStatusEnum = pgEnum('some_status', ['a', 'b', 'c']);

export const things = pgTable('things', {
  // 정석 PK
  id: uuid('id').defaultRandom().primaryKey(),

  // 문자열/숫자/불리언
  name: text('name').notNull(),
  count: integer('count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(false),

  // enum 사용
  status: someStatusEnum('status').notNull().default('a'),

  // FK + cascade (부모 삭제 시 자식 함께)
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),

  // 날짜 / 시각. timestamptz는 withTimezone: true 필수
  someDate: date('some_date'),                    // 'YYYY-MM-DD' 반환 (string mode 기본)
  someTs: timestamp('some_ts', { withTimezone: true, mode: 'string' }), // ISO 문자열

  // 감사 타임스탬프 (표준 형태)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 복합 UNIQUE는 두 번째 콜백에서 배열로
export const childRows = pgTable(
  'child_rows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull().references(() => things.id, { onDelete: 'cascade' }),
    slot: text('slot').notNull(),
  },
  (t) => [unique('child_rows_owner_slot_uq').on(t.ownerId, t.slot)],
);

// 단일 컬럼 UNIQUE는 컬럼 체이닝
export const singletons = pgTable('singletons', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
});
```

- **컬럼 이름은 snake_case**, TS 키는 camelCase. drizzle이 자동 매핑
- 컬럼을 nullable로 두려면 `.notNull()` 생략 (그리고 TS 타입에도 `| null` 자동 반영)
- **소프트 삭제**가 필요하면 `is_archived boolean` 추가 (예: `time_blocks`). 기록성 데이터는 삭제 대신 아카이브

## Barrel 등록

```ts
// apps/api/src/db/schema/index.ts
export * from './companies';
export * from './routines';
export * from './<new-domain>';   // ← 추가
```

## 마이그레이션 흐름

```bash
pnpm --filter api db:generate
# → drizzle/NNNN_<random>.sql 생성. 파일 열어서 사용자에게 SQL 보여주기
# → 사용자 승인 (여기서 반드시 스톱)
pnpm --filter api db:migrate
```

`db:migrate`는 `apps/api/src/db/migrate.ts`가 `bootstrap-env.ts` 통해 루트 `.env` 로드. Session Pooler(port 5432) URI여야 함.

## 모듈/컨트롤러/서비스 템플릿

### module.ts
```ts
import { Module } from '@nestjs/common';
import { ThingsController } from './things.controller';
import { ThingsService } from './things.service';

@Module({
  controllers: [ThingsController],
  providers: [ThingsService],
})
export class ThingsModule {}
```

### controller.ts (표준 5개 액션)
```ts
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ThingsService } from './things.service';
import { CreateThingDto } from './dto/create-thing.dto';
import { UpdateThingDto } from './dto/update-thing.dto';
import { QueryThingsDto } from './dto/query-things.dto';

@Controller('things')
export class ThingsController {
  constructor(private readonly service: ThingsService) {}

  @Get() findAll(@Query() query: QueryThingsDto) { return this.service.findAll(query); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateThingDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateThingDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') @HttpCode(204) async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
```

Upsert가 필요한 리소스(day-notes 같은)면:
```ts
@Put(':naturalKey') upsert(@Param('naturalKey') key: string, @Body() dto: UpsertDto) {
  return this.service.upsert(key, dto);
}
```

Idempotent 토글이 필요한 리소스(routine-checks 같은)면:
```ts
@Put() toggle(@Body() dto: ToggleDto) { return this.service.toggle(dto); }
// 서비스에서 dto.checked이면 onConflictDoNothing insert, 아니면 delete
```

### service.ts
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { things } from '../db/schema';
import type { CreateThingDto } from './dto/create-thing.dto';
import type { UpdateThingDto } from './dto/update-thing.dto';
import type { QueryThingsDto } from './dto/query-things.dto';

@Injectable()
export class ThingsService {
  async findAll(query: QueryThingsDto) {
    const conditions: SQL[] = [];
    if (query.someFilter !== undefined) conditions.push(eq(things.someCol, query.someFilter));
    return db.select().from(things)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(things.createdAt));
  }

  async findOne(id: string) {
    const [row] = await db.select().from(things).where(eq(things.id, id)).limit(1);
    if (!row) throw new NotFoundException(`Thing ${id} not found`);
    return row;
  }

  async create(dto: CreateThingDto) {
    const [row] = await db.insert(things).values(dto).returning();
    return row;
  }

  async update(id: string, dto: UpdateThingDto) {
    const [row] = await db.update(things)
      .set({ ...dto, updatedAt: new Date() })   // updatedAt 수동 갱신 (drizzle 자동 없음)
      .where(eq(things.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Thing ${id} not found`);
    return row;
  }

  async remove(id: string) {
    const [row] = await db.delete(things).where(eq(things.id, id)).returning({ id: things.id });
    if (!row) throw new NotFoundException(`Thing ${id} not found`);
    return { id: row.id };
  }
}
```

Upsert 패턴 (day-notes 참고):
```ts
const [row] = await db.insert(things)
  .values({ key, content })
  .onConflictDoUpdate({
    target: things.key,
    set: { content, updatedAt: new Date() },
  })
  .returning();
```

행 존재 = 상태 패턴 (routine-checks 참고):
```ts
if (dto.on) {
  await db.insert(things).values({ a: dto.a, b: dto.b })
    .onConflictDoNothing({ target: [things.a, things.b] });
} else {
  await db.delete(things).where(and(eq(things.a, dto.a), eq(things.b, dto.b)));
}
```

## DTO 컨벤션 (class-validator)

```ts
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateThingDto {
  @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @IsOptional() @IsEnum(SomeEnumObject)   // ← 배열 X, 객체 O (아래 gotcha 참고)
  status?: SomeEnumType;

  @IsOptional() @IsInt() @Min(0) @Max(1410)
  minutes?: number;

  // Boolean 쿼리 (?flag=true) — enableImplicitConversion 안 켜고 명시적 변환
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  flag?: boolean;

  // 날짜 문자열 YYYY-MM-DD
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsUUID()
  parentId!: string;
}
```

## AppModule 등록

```ts
// apps/api/src/app.module.ts
import { ThingsModule } from './things/things.module';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    CompaniesModule,
    // ...
    ThingsModule,   // ← 추가
  ],
  // ...
})
export class AppModule {}
```

## 스모크 (PowerShell)

한글 body면 반드시 UTF-8 바이트로 (memory `feedback_powershell_utf8_body` 참고):

```powershell
$base = 'http://localhost:3001'
$body = [System.Text.Encoding]::UTF8.GetBytes('{"name":"아침 운동"}')
$r = Invoke-WebRequest -Uri "$base/things" -Method Post `
  -Body $body -ContentType 'application/json; charset=utf-8' -UseBasicParsing
$r.Content
```

체크 순서: `POST → GET (list) → GET (:id) → PATCH → DELETE → GET (empty)`.

## Gotchas (기록성)

- **`@IsEnum(readonly array)` 는 값 목록을 비운다** — 반드시 객체 형태 (`{ a: 'a', b: 'b' } as const`)로 정의해서 넘길 것. troubleshooting.md 참고
- **`enableImplicitConversion: true`는 boolean을 뒤엎는다** — `@Transform`으로만 boolean 다루기
- **한글 body는 UTF-8 바이트로** (PowerShell Invoke-WebRequest)
- **timestamptz 반환이 비표준 포맷**이면 프론트 `new Date()` 파싱 실패 (troubleshooting.md 참고). 필요시 표시 helper에서 정규화
- **updatedAt는 drizzle 자동 갱신 안 됨** — service.update()에서 `updatedAt: new Date()` 수동 세팅
- **소프트 삭제 vs 하드 삭제** — 이력이 중요한 도메인(체크 이력 붙는 blocks 등)은 `is_archived`로 아카이브. 자식이 cascade면 하드 삭제해도 OK
- **컨트롤러 경로는 kebab-case** (`@Controller('time-blocks')`, `@Controller('day-notes')`)

## 참고 실제 사례

- 표준 CRUD 5개: `apps/api/src/companies/*`, `apps/api/src/time-blocks/*`
- 행 존재 = 상태(toggle): `apps/api/src/routine-checks/*`
- Upsert (natural key `:date`): `apps/api/src/day-notes/*`
- 소프트 삭제(`is_archived`) + FK cascade: `apps/api/src/db/schema/routines.ts`
