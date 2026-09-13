import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { blogSources, companyTypes, profiles, questions } from '../db/schema';
import {
  DEFAULT_BLOG_SOURCES,
  DEFAULT_COMPANY_TYPES,
  DEFAULT_QUESTIONS,
} from '../db/defaults';
import { getSupabaseAdmin } from '../supabase-admin';

@Injectable()
export class ProfilesService {
  async findMe(userId: string) {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException('profile not found');
    return row;
  }

  // Create-if-missing, else rename. When creating, seeds company_types,
  // blog_sources, and questions so a fresh account isn't empty on first
  // /jobs, /blog, and /learn visits. Exercises are intentionally not seeded
  // — new users pick their own.
  async upsertMe(userId: string, nickname: string) {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1);
        const isNewProfile = existing.length === 0;

        const [row] = await tx
          .insert(profiles)
          .values({ id: userId, nickname })
          .onConflictDoUpdate({
            target: profiles.id,
            set: { nickname, updatedAt: new Date() },
          })
          .returning();

        if (isNewProfile) {
          await tx
            .insert(companyTypes)
            .values(DEFAULT_COMPANY_TYPES.map((t) => ({ ...t, ownerId: userId })));
          await tx
            .insert(blogSources)
            .values(
              DEFAULT_BLOG_SOURCES.map((s, i) => ({
                ...s,
                ownerId: userId,
                sortOrder: i,
              })),
            );
          await tx
            .insert(questions)
            .values(DEFAULT_QUESTIONS.map((q) => ({ ...q, ownerId: userId })));
        }

        return row;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'profiles_nickname_unique')) {
        throw new ConflictException('nickname already taken');
      }
      throw err;
    }
  }

  async renameMe(userId: string, nickname: string) {
    try {
      const [row] = await db
        .update(profiles)
        .set({ nickname, updatedAt: new Date() })
        .where(eq(profiles.id, userId))
        .returning();
      if (!row) throw new NotFoundException('profile not found');
      return row;
    } catch (err) {
      if (isUniqueViolation(err, 'profiles_nickname_unique')) {
        throw new ConflictException('nickname already taken');
      }
      throw err;
    }
  }

  // 계정 삭제 = auth.users(id) 삭제. profiles와 도메인 데이터는 각각의
  // FK가 auth.users(id) ON DELETE CASCADE라 자동 정리(12.2·12.4에서 세팅).
  // 앱은 tx 없이 admin API에만 위임 — Postgres 쪽 CASCADE가 원자적.
  async deleteMe(userId: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      throw new InternalServerErrorException(
        `failed to delete auth user: ${error.message}`,
      );
    }
  }

  // Case-sensitive as stored. Returns whether the nickname is available for
  // a new profile (or for a rename by a different user).
  async isAvailable(nickname: string): Promise<boolean> {
    const [row] = await db
      .select({ n: sql<number>`1` })
      .from(profiles)
      .where(eq(profiles.nickname, nickname))
      .limit(1);
    return !row;
  }
}

// Postgres unique_violation. Drizzle bubbles the driver error through; the
// code and constraint name identify our specific index.
function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; constraint_name?: string };
  return e.code === '23505' && e.constraint_name === constraint;
}
