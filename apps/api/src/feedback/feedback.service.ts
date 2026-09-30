import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import type { AdminFeedback, Feedback, FeedbackCategory } from '@repo/shared';
import { db } from '../db/client';
import { feedback, profiles } from '../db/schema';
import { getSupabaseAdmin } from '../supabase-admin';
import type { CreateFeedbackDto } from './dto/create-feedback.dto';

const ADMIN_LIST_LIMIT = 100;

@Injectable()
export class FeedbackService {
  async create(userId: string, dto: CreateFeedbackDto): Promise<Feedback> {
    const [row] = await db
      .insert(feedback)
      .values({
        userId,
        category: dto.category,
        body: dto.body,
        page: dto.page ?? null,
        version: dto.version ?? null,
      })
      .returning();
    return this.toDto(row);
  }

  // 어드민 조회. profiles(nickname) + Supabase Admin API(email)와 조인.
  // 100건 상한 — 넘어가면 필터/페이지네이션 추가 검토.
  async listAllForAdmin(): Promise<AdminFeedback[]> {
    const rows = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(ADMIN_LIST_LIMIT);
    if (rows.length === 0) return [];

    const userIds = Array.from(new Set(rows.map((r) => r.userId)));

    const nicknameRows = await db
      .select({ id: profiles.id, nickname: profiles.nickname })
      .from(profiles)
      .where(inArray(profiles.id, userIds));
    const nicknameById = new Map(nicknameRows.map((r) => [r.id, r.nickname]));

    // Supabase는 admin.auth.admin.listUsers만 있고 다건 조회 API가 없어
    // 페이지 전량 pull 후 in-memory lookup. 유저 규모 소수라 OK.
    const emailById = await this.loadEmails(userIds);

    return rows.map((r) => ({
      ...this.toDto(r),
      nickname: nicknameById.get(r.userId) ?? null,
      email: emailById.get(r.userId) ?? null,
    }));
  }

  // 어드민 전용 하드 삭제. RLS 통과는 postgres role이 알아서.
  async removeForAdmin(id: string): Promise<void> {
    const [row] = await db
      .delete(feedback)
      .where(eq(feedback.id, id))
      .returning({ id: feedback.id });
    if (!row) {
      throw new NotFoundException(`feedback ${id} not found`);
    }
  }

  private async loadEmails(userIds: string[]): Promise<Map<string, string | null>> {
    const admin = getSupabaseAdmin();
    const perPage = 200;
    const need = new Set(userIds);
    const out = new Map<string, string | null>();
    let page = 1;
    while (need.size > 0) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new InternalServerErrorException(
          `feedback loadEmails failed: ${error.message}`,
        );
      }
      for (const u of data.users) {
        if (need.has(u.id)) {
          out.set(u.id, u.email ?? null);
          need.delete(u.id);
        }
      }
      if (data.users.length < perPage) break;
      page += 1;
    }
    return out;
  }

  private toDto(row: typeof feedback.$inferSelect): Feedback {
    return {
      id: row.id,
      userId: row.userId,
      category: row.category as FeedbackCategory,
      body: row.body,
      page: row.page,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
