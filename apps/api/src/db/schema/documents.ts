import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// 사용자가 여러 버전의 이력서·포폴을 저장하고 kind별로 대표 문서 하나를
// 지정. kind='link'는 외부 URL만 저장(파일 없음). 첫 릴리스는 PDF only —
// Storage 버킷 `documents`의 allowed_mime_types와 DTO 검증에서 강제.
//
// FK to auth.users(id) ON DELETE CASCADE는 마이그 raw SQL에서 부여
// (Drizzle이 Supabase auth 스키마 모름). RLS도 마이그에서 owner_id 기반
// 4개 정책. 실제 파일은 Supabase Storage `documents` 버킷의
// {owner_id}/{kind}/{document_id}.pdf 경로에 저장.
export const documentKindEnum = pgEnum('document_kind', [
  'resume',
  'portfolio',
  'link',
]);

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  kind: documentKindEnum('kind').notNull(),
  title: text('title').notNull(),
  // 파일 kind만 값 있음. link는 null.
  storagePath: text('storage_path'),
  // link kind만 값 있음. 파일 kind는 null.
  url: text('url'),
  fileSize: integer('file_size'),
  fileMime: text('file_mime'),
  // kind당 하나만 대표. partial unique index로 강제 (마이그에서 부여).
  isActive: boolean('is_active').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
