import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from './companies';

// 회사별 일정 이벤트. applicationDeadline이 companies 테이블에 primary 필드로
// 남아있는 건 유지하되(필터·정렬·알림 로직이 쓰고 있음), 그 외 날짜(면접/시험/발표/
// 1차 2차 등)를 유연하게 담기 위해 별도 테이블. 한 회사당 여러 이벤트 가능.
// 스케쥴러는 이 테이블을 read-only로 읽어와 렌더만 하고, CRUD는 /jobs 쪽.
export const companyEventTypeEnum = pgEnum('company_event_type', [
  'deadline',
  'test',
  'interview',
  'announcement',
  'other',
]);

export const companyEvents = pgTable(
  'company_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    // Owner (denormalized from companies.ownerId for RLS/filter efficiency).
    // App layer must set this to the parent company's owner on insert.
    ownerId: uuid('owner_id').notNull(),
    date: date('date').notNull(),
    type: companyEventTypeEnum('type').notNull(),
    // "1차 면접", "최종 발표" 같은 자유 라벨 (optional).
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // 월 단위 조회가 메인 (스케쥴러의 GET /month). owner_id + date로 커버.
    index('company_events_owner_date_idx').on(t.ownerId, t.date),
    // 회사 상세에서 그 회사 이벤트만 조회할 때.
    index('company_events_company_idx').on(t.companyId),
  ],
);

// 날짜당 메모 1개 (한 줄). 스케쥴러 자체 저장. day_notes와 역할 분리:
// - day_notes: 주간 회고 (주 월요일 키)
// - scheduler_memos: 날짜별 자유 메모 (범용)
export const schedulerMemos = pgTable(
  'scheduler_memos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    date: date('date').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('scheduler_memos_owner_date_uq').on(t.ownerId, t.date),
    index('scheduler_memos_owner_date_idx').on(t.ownerId, t.date),
  ],
);
