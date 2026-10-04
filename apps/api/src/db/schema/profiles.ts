import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { Preferences } from '@repo/shared';

// Per-user profile. id is the auth.users(id) — 1:1 mapping. FK constraint
// to auth.users is added in the migration (raw SQL) since Drizzle doesn't
// know about Supabase's `auth` schema. Cascade on delete so removing a
// Supabase user cleans up the profile.
//
// nickname is UNIQUE at DB level — the /profiles/check-nickname endpoint
// pre-checks for UX, but the constraint is the real gate against races.
//
// RLS is deferred to Phase 12.4 (uniform enable across all domain tables).
// For now the backend (postgres role) bypasses RLS and enforces ownership
// in the service layer via req.user.id.
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  nickname: text('nickname').notNull().unique(),
  // 알림 마스터/개별 on/off · workout-skip 요일 등 사용자 설정을 서버에
  // sync해 다중 기기 간 일관성 확보. 스키마는 packages/shared의
  // `Preferences`가 정의(nested: notif.*). 신규 계정은 {}로 시작해서
  // 클라 진입 시 localStorage 값으로 1회 upload.
  preferences: jsonb('preferences')
    .$type<Preferences>()
    .notNull()
    .default({} as Preferences),
  // defaults.ts:DEFAULTS_VERSION 스냅샷. findMe에서 값이 낮으면 seedUserDefaults 재실행
  // 후 이 컬럼을 현재 버전으로 bump. 신규 가입은 upsertMe에서 곧바로 최신값으로 세팅.
  // 기본값 0 = 자동 sync 대상 (Phase 12 이전 & 기존 prod 유저 전부).
  defaultsVersion: integer('defaults_version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
