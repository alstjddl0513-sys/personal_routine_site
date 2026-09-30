import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  AdminAnnouncement,
  AdminStatsOverview,
  AdminUserRow,
  AdminUsersPage,
  Announcement,
  BanDurationHours,
} from '@repo/shared';
import { db } from '../db/client';
import {
  announcementReads,
  announcementTargets,
  announcements,
  profiles,
} from '../db/schema';
import { getSupabaseAdmin } from '../supabase-admin';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { parseAdminUserIds } from './is-admin.util';

// 어드민 전용 서비스. AdminGuard 뒤에서만 호출됨.
// Supabase Admin API + profiles 조인 조합으로 사용자 관리.
// 공지는 announcements + announcement_targets 조합. 트랜잭션 정합성 유지.

const PER_PAGE_DEFAULT = 50;

@Injectable()
export class AdminService {
  constructor(private readonly config: ConfigService) {}

  // 어드민 계정 대상 파괴적 액션 방어. self-lockout · 다른 어드민 무력화 X.
  // Guard로 접근은 통제되지만 target 자체가 admin이면 서비스 레이어에서 거절.
  private assertNotAdmin(userId: string): void {
    if (parseAdminUserIds(this.config).has(userId)) {
      throw new ForbiddenException('cannot modify admin account');
    }
  }

  // Supabase Admin listUsers + profiles LEFT JOIN. 검색·정렬은 앱 레벨.
  // SDK가 검색 미지원 + 초기 유저 수 작아 pull 후 filter가 단순.
  async listUsers(query: QueryUsersDto): Promise<AdminUsersPage> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? PER_PAGE_DEFAULT;
    const admin = getSupabaseAdmin();

    // Supabase page는 1-base. perPage 상한은 SDK 200이라 DTO에서 이미 검증.
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new InternalServerErrorException(
        `listUsers failed: ${error.message}`,
      );
    }

    const authUsers = data.users;
    const ids = authUsers.map((u) => u.id);
    const nicknameRows = ids.length
      ? await db
          .select({ id: profiles.id, nickname: profiles.nickname })
          .from(profiles)
          .where(inArray(profiles.id, ids))
      : [];
    const nicknameById = new Map(
      nicknameRows.map((r) => [r.id, r.nickname]),
    );
    const adminIds = parseAdminUserIds(this.config);

    let rows: AdminUserRow[] = authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      nickname: nicknameById.get(u.id) ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      bannedUntil:
        typeof (u as { banned_until?: string }).banned_until === 'string'
          ? (u as { banned_until?: string }).banned_until!
          : null,
      isAdmin: adminIds.has(u.id),
    }));

    // 검색: nickname 또는 email에 포함(대소문자 무관)
    if (query.search) {
      const needle = query.search.trim().toLowerCase();
      if (needle) {
        rows = rows.filter(
          (r) =>
            (r.nickname && r.nickname.toLowerCase().includes(needle)) ||
            (r.email && r.email.toLowerCase().includes(needle)),
        );
      }
    }

    // 정렬: createdAt(default) or lastSignInAt DESC. null은 뒤로.
    const sortBy = query.sortBy ?? 'createdAt';
    rows.sort((a, b) => {
      const av = a[sortBy] ?? '';
      const bv = b[sortBy] ?? '';
      if (av === bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return av < bv ? 1 : -1;
    });

    return {
      page,
      perPage,
      total: data.total ?? authUsers.length,
      users: rows,
    };
  }

  // 개요 지표. Supabase auth.users를 전량 pull(200/page 반복)해서 카운터 계산.
  // 유저 규모 소수라 O(n) 앱 레벨 집계로 충분. 커지면 DB 뷰나 캐시로 승격.
  async getStatsOverview(): Promise<AdminStatsOverview> {
    const admin = getSupabaseAdmin();
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const cutoff24h = now - DAY_MS;
    const cutoff7d = now - 7 * DAY_MS;
    const cutoff30d = now - 30 * DAY_MS;
    const perPage = 200;

    let totalUsers = 0;
    let dau = 0;
    let wau = 0;
    let mau = 0;
    let signups7d = 0;
    let signups30d = 0;
    let page = 1;
    // Supabase는 페이지 초과 시 빈 배열 반환. batch.length < perPage 시 종료.
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw new InternalServerErrorException(
          `getStatsOverview failed: ${error.message}`,
        );
      }
      for (const u of data.users) {
        totalUsers += 1;
        if (u.last_sign_in_at) {
          const ts = Date.parse(u.last_sign_in_at);
          if (ts >= cutoff24h) dau += 1;
          if (ts >= cutoff7d) wau += 1;
          if (ts >= cutoff30d) mau += 1;
        }
        const cts = Date.parse(u.created_at);
        if (cts >= cutoff7d) signups7d += 1;
        if (cts >= cutoff30d) signups30d += 1;
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    return {
      totalUsers,
      dau,
      wau,
      mau,
      signups7d,
      signups30d,
      generatedAt: new Date().toISOString(),
    };
  }

  async banUser(
    id: string,
    durationHours: BanDurationHours,
  ): Promise<{ id: string; bannedUntil: string | null }> {
    this.assertNotAdmin(id);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: `${durationHours}h`,
    });
    if (error) {
      throw new InternalServerErrorException(
        `banUser failed: ${error.message}`,
      );
    }
    const u = data.user as { banned_until?: string | null } | null;
    return { id, bannedUntil: u?.banned_until ?? null };
  }

  async unbanUser(
    id: string,
  ): Promise<{ id: string; bannedUntil: string | null }> {
    this.assertNotAdmin(id);
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    });
    if (error) {
      throw new InternalServerErrorException(
        `unbanUser failed: ${error.message}`,
      );
    }
    return { id, bannedUntil: null };
  }

  // 강제 탈퇴. 12.4b profiles.deleteMe와 같은 원리(auth.users → CASCADE).
  // 어드민 대상은 거절 — self-lockout · 다른 어드민 무력화 방지. 어드민 본인
  // 탈퇴는 /settings의 AccountDeleteRow(self-delete)로만 가능.
  async deleteUser(id: string): Promise<void> {
    this.assertNotAdmin(id);
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      throw new InternalServerErrorException(
        `deleteUser failed: ${error.message}`,
      );
    }
  }

  // --- announcements ---

  async listAnnouncements(): Promise<AdminAnnouncement[]> {
    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    // 세 배치 병렬:
    //  a) 각 공지의 targets 목록 (기존)
    //  b) 각 공지의 읽음 카운트 (신규)
    //  c) 전체 유저 수 — 타겟 없는 공지의 분모 (신규)
    const [targetRows, readCountRows, [{ totalUsers }]] = await Promise.all([
      db
        .select()
        .from(announcementTargets)
        .where(inArray(announcementTargets.announcementId, ids)),
      db
        .select({
          announcementId: announcementReads.announcementId,
          cnt: sql<number>`count(*)::int`,
        })
        .from(announcementReads)
        .where(inArray(announcementReads.announcementId, ids))
        .groupBy(announcementReads.announcementId),
      db.select({ totalUsers: sql<number>`count(*)::int` }).from(profiles),
    ]);

    const targetsByAnn = new Map<string, string[]>();
    for (const t of targetRows) {
      const list = targetsByAnn.get(t.announcementId) ?? [];
      list.push(t.userId);
      targetsByAnn.set(t.announcementId, list);
    }
    const readsByAnn = new Map<string, number>();
    for (const r of readCountRows) {
      readsByAnn.set(r.announcementId, Number(r.cnt));
    }

    return rows.map((r) => {
      const targetIds = targetsByAnn.get(r.id) ?? [];
      const targets = targetIds.length > 0 ? targetIds.length : totalUsers;
      const reads = readsByAnn.get(r.id) ?? 0;
      return {
        ...this.toAnnouncement(r, targetIds),
        stats: { reads, targets },
      };
    });
  }

  async createAnnouncement(dto: CreateAnnouncementDto): Promise<AdminAnnouncement> {
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(announcements)
        .values({
          kind: dto.kind,
          title: dto.title,
          body: dto.body,
          isActive: dto.isActive ?? true,
          startsAt: this.parseDate(dto.startsAt),
          endsAt: this.parseDate(dto.endsAt),
        })
        .returning();

      const targets = dto.targetUserIds ?? [];
      if (targets.length > 0) {
        await tx.insert(announcementTargets).values(
          targets.map((userId) => ({
            announcementId: row.id,
            userId,
          })),
        );
      }
      return { row, targets };
    });
    const stats = await this.computeAnnouncementStats(
      created.row.id,
      created.targets,
    );
    return { ...this.toAnnouncement(created.row, created.targets), stats };
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AdminAnnouncement> {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(announcements)
        .where(eq(announcements.id, id))
        .limit(1);
      if (!current) throw new NotFoundException(`announcement ${id} not found`);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (dto.kind !== undefined) patch.kind = dto.kind;
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.body !== undefined) patch.body = dto.body;
      if (dto.isActive !== undefined) patch.isActive = dto.isActive;
      if (dto.startsAt !== undefined) patch.startsAt = this.parseDate(dto.startsAt);
      if (dto.endsAt !== undefined) patch.endsAt = this.parseDate(dto.endsAt);

      const [row] = await tx
        .update(announcements)
        .set(patch)
        .where(eq(announcements.id, id))
        .returning();

      // targetUserIds 명시적으로 오면 완전 교체. undefined면 유지.
      let effectiveTargets: string[];
      if (dto.targetUserIds !== undefined) {
        await tx
          .delete(announcementTargets)
          .where(eq(announcementTargets.announcementId, id));
        if (dto.targetUserIds.length > 0) {
          await tx.insert(announcementTargets).values(
            dto.targetUserIds.map((userId) => ({
              announcementId: id,
              userId,
            })),
          );
        }
        effectiveTargets = dto.targetUserIds;
      } else {
        const existing = await tx
          .select({ userId: announcementTargets.userId })
          .from(announcementTargets)
          .where(eq(announcementTargets.announcementId, id));
        effectiveTargets = existing.map((e) => e.userId);
      }

      return { row, effectiveTargets };
    }).then(async ({ row, effectiveTargets }) => {
      const stats = await this.computeAnnouncementStats(row.id, effectiveTargets);
      return { ...this.toAnnouncement(row, effectiveTargets), stats };
    });
  }

  async removeAnnouncement(id: string): Promise<void> {
    const result = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning({ id: announcements.id });
    if (result.length === 0) {
      throw new NotFoundException(`announcement ${id} not found`);
    }
    // announcement_targets · announcement_reads는 FK CASCADE로 자동 정리.
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`invalid date: ${value}`);
    }
    return d;
  }

  // 단건 create/update 뒤에 stats 계산용. reads는 해당 공지 하나에 대한
  // COUNT, targets는 명시된 수 or 전체 profiles.
  private async computeAnnouncementStats(
    announcementId: string,
    targetUserIds: string[],
  ): Promise<{ reads: number; targets: number }> {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(announcementReads)
      .where(eq(announcementReads.announcementId, announcementId));
    let targets = targetUserIds.length;
    if (targets === 0) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(profiles);
      targets = Number(n);
    }
    return { reads: Number(cnt), targets };
  }

  private toAnnouncement(
    row: typeof announcements.$inferSelect,
    targetUserIds: string[],
  ): Announcement {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      isActive: row.isActive,
      startsAt: row.startsAt ? row.startsAt.toISOString() : null,
      endsAt: row.endsAt ? row.endsAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      targetUserIds,
    };
  }
}
