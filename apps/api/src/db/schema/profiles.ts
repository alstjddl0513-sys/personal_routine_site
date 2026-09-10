import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
