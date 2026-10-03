import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { timeBlocks } from './routines';

// 루틴 D-day 챌린지: "100일간 아침 운동 매일" 같은 목표 설정 + 진행률 추적.
// 성공 일수 = start_date~오늘 중 "포함된 모든 블록이 체크된 날"의 개수.
// 서비스 레이어가 매 GET마다 계산해서 target 도달 시 자동 'completed' 전환.

export const routineChallengeStatusEnum = pgEnum('routine_challenge_status', [
  'active',
  'completed',
  'abandoned',
]);

export const routineChallenges = pgTable('routine_challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  title: text('title').notNull(),
  startDate: date('start_date').notNull(),
  targetDays: integer('target_days').notNull(),
  status: routineChallengeStatusEnum('status').notNull().default('active'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// M2M: 챌린지 ↔ 블록. 챌린지당 블록 N개 (보통 1~5개).
// time_blocks는 soft delete(isArchived)라 보통 하드 삭제 안 되지만,
// 혹시라도 FK CASCADE로 안전하게.
export const routineChallengeBlocks = pgTable(
  'routine_challenge_blocks',
  {
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => routineChallenges.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => timeBlocks.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.challengeId, t.blockId] }),
    index('rcb_block_idx').on(t.blockId),
  ],
);
