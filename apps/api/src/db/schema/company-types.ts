import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// User-editable list of company_type_2 values (서비스/솔루션/SI/…).
// Previously a Postgres enum, moved to a table so the user can add/remove
// entries at runtime. `companies.type2` is now a plain text column that
// stores the `key` — no FK, so removing a type from the list just hides
// it from pickers without touching existing rows.
export const companyTypes = pgTable(
  'company_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
    ownerId: uuid('owner_id').notNull(),

    // Machine identifier, also the value stored in companies.type2.
    // UNIQUE is scoped per-owner: two users can independently define a "SI"
    // type without colliding.
    key: text('key').notNull(),
    // Human label shown in the UI.
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    // True for the six seeded values so the UI can render a subtle badge.
    // Not enforced — the row can still be deleted like any other.
    isDefault: boolean('is_default').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('company_types_owner_key_uq').on(t.ownerId, t.key)],
);
