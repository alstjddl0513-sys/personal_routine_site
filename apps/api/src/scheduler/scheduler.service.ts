import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, between, eq, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { companies, companyEvents, schedulerMemos } from '../db/schema';
import type { SchedulerEvent } from '@repo/shared';
import type { QueryRangeDto } from './dto/query-range.dto';
import type { UpsertMemoDto } from './dto/upsert-memo.dto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class SchedulerService {
  // 월 뷰: 범위 안의 job 이벤트(company_events + companies 조인) + 메모 통합 반환.
  // companies.applicationDeadline은 companies 테이블 자체 필드라 별도로 끌어와 합침.
  async findRange(
    ownerId: string,
    query: QueryRangeDto,
  ): Promise<SchedulerEvent[]> {
    const [jobEvents, deadlineRows, memoRows] = await Promise.all([
      // company_events (deadline/test/interview/announcement/other)
      db
        .select({
          date: companyEvents.date,
          type: companyEvents.type,
          companyId: companyEvents.companyId,
          companyName: companies.name,
          note: companyEvents.note,
        })
        .from(companyEvents)
        .innerJoin(companies, eq(companyEvents.companyId, companies.id))
        .where(
          and(
            eq(companyEvents.ownerId, ownerId),
            between(companyEvents.date, query.from, query.to),
          ),
        ),
      // companies.applicationDeadline — 'deadline' 서브타입으로 섞어줌.
      // isRolling true면 서비스 레이어에서 deadline 무시되지만, 테이블엔 저장 가능.
      // 안전하게 isRolling=false이고 deadline 있는 것만.
      db
        .select({
          date: sql<string>`to_char(${companies.applicationDeadline}, 'YYYY-MM-DD')`,
          companyId: companies.id,
          companyName: companies.name,
        })
        .from(companies)
        .where(
          and(
            eq(companies.ownerId, ownerId),
            eq(companies.isRolling, false),
            isNotNull(companies.applicationDeadline),
            sql`to_char(${companies.applicationDeadline}, 'YYYY-MM-DD') BETWEEN ${query.from} AND ${query.to}`,
          ),
        ),
      // scheduler_memos
      db
        .select({
          date: schedulerMemos.date,
          content: schedulerMemos.content,
        })
        .from(schedulerMemos)
        .where(
          and(
            eq(schedulerMemos.ownerId, ownerId),
            between(schedulerMemos.date, query.from, query.to),
          ),
        )
        .orderBy(asc(schedulerMemos.date)),
    ]);

    const events: SchedulerEvent[] = [];
    for (const e of jobEvents) {
      events.push({
        kind: 'job',
        date: e.date,
        type: e.type,
        companyId: e.companyId,
        companyName: e.companyName,
        note: e.note,
      });
    }
    for (const d of deadlineRows) {
      events.push({
        kind: 'job',
        date: d.date,
        type: 'deadline',
        companyId: d.companyId,
        companyName: d.companyName,
        note: null,
      });
    }
    for (const m of memoRows) {
      events.push({
        kind: 'memo',
        date: m.date,
        content: m.content,
      });
    }
    // 날짜 오름차순 정렬 (안정적 순서 — 같은 날짜 안에서 kind/subtype은 UI가 처리).
    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  async upsertMemo(ownerId: string, date: string, dto: UpsertMemoDto) {
    if (!DATE_RE.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const content = dto.content.trim();
    if (content.length === 0) {
      await db
        .delete(schedulerMemos)
        .where(
          and(
            eq(schedulerMemos.ownerId, ownerId),
            eq(schedulerMemos.date, date),
          ),
        );
      return { date, content: '' };
    }
    const [row] = await db
      .insert(schedulerMemos)
      .values({ ownerId, date, content })
      .onConflictDoUpdate({
        target: [schedulerMemos.ownerId, schedulerMemos.date],
        set: { content, updatedAt: new Date() },
      })
      .returning({
        date: schedulerMemos.date,
        content: schedulerMemos.content,
        updatedAt: schedulerMemos.updatedAt,
      });
    return row;
  }
}
