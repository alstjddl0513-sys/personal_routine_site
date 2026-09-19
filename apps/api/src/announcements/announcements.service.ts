import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, inArray, isNull, lte, or } from 'drizzle-orm';
import type { UserAnnouncement } from '@repo/shared';
import { db } from '../db/client';
import {
  announcementReads,
  announcementTargets,
  announcements,
} from '../db/schema';

// 일반 유저용. AdminGuard 없음, 전역 SupabaseAuthGuard만 통과.
// 인박스 모델: 활성 + 기간 매치 + (전체 대상 OR 나 포함) 공지를 전부 반환하되,
// 각 공지에 이 사용자의 `readAt`을 붙임(null=미읽음). 읽어도 목록엔 계속 남고
// 뱃지 카운트만 미읽음 갯수로. 어드민이 isActive=false 하거나 기간을 지나면
// 자연스레 사라짐.

const LIST_LIMIT = 30;

@Injectable()
export class AnnouncementsService {
  async findForUser(userId: string): Promise<UserAnnouncement[]> {
    const now = new Date();

    // 1) 활성 + 기간 매치 공지 후보
    const active = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(
            isNull(announcements.startsAt),
            lte(announcements.startsAt, now),
          ),
          or(isNull(announcements.endsAt), gt(announcements.endsAt, now)),
        ),
      )
      .orderBy(desc(announcements.createdAt));

    if (active.length === 0) return [];
    const ids = active.map((r) => r.id);

    // 2) 이 사용자의 읽음 처리 Map<annId, readAt>
    const readRows = await db
      .select()
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.userId, userId),
          inArray(announcementReads.announcementId, ids),
        ),
      );
    const readByAnn = new Map<string, Date>();
    for (const r of readRows) {
      readByAnn.set(r.announcementId, r.readAt);
    }

    // 3) 후보 공지들의 타겟 배치 조회. Map<annId, Set<userId>>.
    //    타겟 zero row(맵에 없음) = 전체 대상.
    const targetRows = await db
      .select()
      .from(announcementTargets)
      .where(inArray(announcementTargets.announcementId, ids));
    const targetsByAnn = new Map<string, Set<string>>();
    for (const t of targetRows) {
      const set = targetsByAnn.get(t.announcementId) ?? new Set<string>();
      set.add(t.userId);
      targetsByAnn.set(t.announcementId, set);
    }

    // 4) 타겟 필터: 타겟 없음 OR 나 포함 → 최대 LIST_LIMIT
    const filtered = active
      .filter((r) => {
        const targets = targetsByAnn.get(r.id);
        return !targets || targets.size === 0 || targets.has(userId);
      })
      .slice(0, LIST_LIMIT);

    return filtered.map((r) => {
      const readAt = readByAnn.get(r.id);
      return {
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        isActive: r.isActive,
        startsAt: r.startsAt ? r.startsAt.toISOString() : null,
        endsAt: r.endsAt ? r.endsAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        // 개인정보 누출 방지: 일반 유저 응답엔 타겟 목록 노출 X
        targetUserIds: [],
        readAt: readAt ? readAt.toISOString() : null,
      };
    });
  }

  // 읽음 처리. INSERT ON CONFLICT DO NOTHING. 공지가 존재하지 않으면 404.
  async markRead(userId: string, announcementId: string): Promise<void> {
    const [existing] = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    if (!existing) {
      throw new NotFoundException(`announcement ${announcementId} not found`);
    }
    await db
      .insert(announcementReads)
      .values({ userId, announcementId })
      .onConflictDoNothing();
  }
}
