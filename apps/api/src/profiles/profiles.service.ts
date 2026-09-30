import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  blogSources,
  companyTypes,
  muscleGoals,
  profiles,
  questionCategories,
  questions,
} from '../db/schema';
import {
  DEFAULT_BLOG_SOURCES,
  DEFAULT_COMPANY_TYPES,
  DEFAULT_MUSCLE_GOALS,
  DEFAULT_QUESTION_CATEGORIES,
  DEFAULT_QUESTIONS,
  DEFAULTS_VERSION,
} from '../db/defaults';
import { getSupabaseAdmin } from '../supabase-admin';
import { isAdminUserId } from '../admin/is-admin.util';
import { deepMerge } from './preferences.util';
import type { PatchPreferencesDto } from './dto/patch-preferences.dto';

// db.transaction의 콜백이 받는 tx 파라미터 타입. seedUserDefaults가 upsertMe
// 와 findMe 양쪽 tx를 공통으로 받기 위함.
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ProfilesService {
  constructor(private readonly config: ConfigService) {}

  // isAdmin은 DB 컬럼이 아니라 env `ADMIN_USER_IDS` 매치로 파생. 서비스가
  // 컨트롤러 대신 이 계산까지 책임져야 응답 shape가 shared `Profile` 타입과
  // 정확히 일치한다. Phase 12.5.
  //
  // Lazy defaults sync: profile.defaults_version < DEFAULTS_VERSION 이면
  // seedUserDefaults를 돌리고 컬럼을 최신값으로 bump. defaults.ts가 커질 때마다
  // 관리자가 유저별 수동 seed를 돌릴 필요 없이 다음 세션 한 번에 backfill됨.
  async findMe(userId: string) {
    const [initial] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!initial) throw new NotFoundException('profile not found');

    let row = initial;
    if (row.defaultsVersion < DEFAULTS_VERSION) {
      row = await db.transaction(async (tx) => {
        // Re-read under row lock so two concurrent findMe from the same user
        // (e.g. parallel SSR + client hydration) can't double-seed.
        const [locked] = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.id, userId))
          .for('update')
          .limit(1);
        if (!locked) throw new NotFoundException('profile not found');
        if (locked.defaultsVersion >= DEFAULTS_VERSION) return locked;
        await this.seedUserDefaults(tx, userId);
        const [bumped] = await tx
          .update(profiles)
          .set({ defaultsVersion: DEFAULTS_VERSION, updatedAt: new Date() })
          .where(eq(profiles.id, userId))
          .returning();
        return bumped;
      });
    }
    // defaultsVersion은 내부 sync 트래킹 용도라 shared `Profile`에서 제외 →
    // 응답 shape에서도 벗겨서 클라 오염 방지.
    const { defaultsVersion: _v, ...publicRow } = row;
    return { ...publicRow, isAdmin: isAdminUserId(this.config, userId) };
  }

  // Create-if-missing, else rename. When creating, seeds company_types,
  // blog_sources, questions, and muscle_goals so a fresh account isn't empty
  // on first /jobs, /blog, /learn, and /workouts/statistics visits. Exercises
  // are intentionally not seeded — new users pick their own.
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
          .values({
            id: userId,
            nickname,
            // 신규 유저는 곧바로 시드한 뒤라 최신 버전으로 세팅 → findMe에서
            // 재sync 안 함. 기존 유저(이 컬럼 default=0)는 findMe에서 backfill.
            defaultsVersion: DEFAULTS_VERSION,
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: { nickname, updatedAt: new Date() },
          })
          .returning();
        const { defaultsVersion: _v, ...publicRow } = row;
        const rowWithAdmin = {
          ...publicRow,
          isAdmin: isAdminUserId(this.config, userId),
        };

        if (isNewProfile) {
          await this.seedUserDefaults(tx, userId);
        }

        return rowWithAdmin;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'profiles_nickname_unique')) {
        throw new ConflictException('nickname already taken');
      }
      throw err;
    }
  }

  // Idempotent seed. Callable both from upsertMe(new signup) and findMe(lazy
  // backfill for existing users). Duplicates: company_types/question_categories/
  // muscle_goals/blog_sources는 (owner_id, key|rss_url|muscle_key) unique로
  // ON CONFLICT DO NOTHING. questions는 unique가 없어서 content 기준 SELECT →
  // 없는 것만 INSERT (seed-questions.ts와 동일 dedupe). 유저가 커스텀 편집한
  // seed 문항은 update(isSeed=false 제약)으로 못 건드리게 돼 있으므로 content
  // 매치가 안정적.
  private async seedUserDefaults(tx: DrizzleTx, userId: string): Promise<void> {
    await tx
      .insert(companyTypes)
      .values(DEFAULT_COMPANY_TYPES.map((t) => ({ ...t, ownerId: userId })))
      .onConflictDoNothing({
        target: [companyTypes.ownerId, companyTypes.key],
      });
    await tx
      .insert(blogSources)
      .values(
        DEFAULT_BLOG_SOURCES.map((s, i) => ({
          ...s,
          ownerId: userId,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({
        target: [blogSources.ownerId, blogSources.rssUrl],
      });
    await tx
      .insert(questionCategories)
      .values(
        DEFAULT_QUESTION_CATEGORIES.map((c) => ({ ...c, ownerId: userId })),
      )
      .onConflictDoNothing({
        target: [questionCategories.ownerId, questionCategories.key],
      });
    await tx
      .insert(muscleGoals)
      .values(DEFAULT_MUSCLE_GOALS.map((g) => ({ ...g, ownerId: userId })))
      .onConflictDoNothing({
        target: [muscleGoals.ownerId, muscleGoals.muscleKey],
      });

    // questions: no unique constraint; dedupe by content.
    const existingContents = await tx
      .select({ content: questions.content })
      .from(questions)
      .where(
        and(
          eq(questions.ownerId, userId),
          inArray(
            questions.content,
            DEFAULT_QUESTIONS.map((q) => q.content),
          ),
        ),
      );
    const have = new Set(existingContents.map((r) => r.content));
    const missing = DEFAULT_QUESTIONS.filter((q) => !have.has(q.content));
    if (missing.length > 0) {
      await tx
        .insert(questions)
        .values(missing.map((q) => ({ ...q, ownerId: userId, isSeed: true })));
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
      const { defaultsVersion: _v, ...publicRow } = row;
      return { ...publicRow, isAdmin: isAdminUserId(this.config, userId) };
    } catch (err) {
      if (isUniqueViolation(err, 'profiles_nickname_unique')) {
        throw new ConflictException('nickname already taken');
      }
      throw err;
    }
  }

  // preferences JSONB에 partial deep merge. Postgres `||` 대신 앱 레이어에서
  // 병합한 뒤 통째 UPDATE — nested 필드(workoutSkip 등)가 shallow overwrite
  // 되는 걸 막기 위함. FOR UPDATE row lock으로 동시 조작 시 lost-update 방지.
  async patchPreferences(userId: string, patch: PatchPreferencesDto) {
    return db.transaction(async (tx) => {
      const [cur] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId))
        .for('update')
        .limit(1);
      if (!cur) throw new NotFoundException('profile not found');
      const merged = deepMerge(
        (cur.preferences ?? {}) as unknown as Record<string, unknown>,
        patch as unknown as Record<string, unknown>,
      );
      const [row] = await tx
        .update(profiles)
        .set({
          preferences: merged as unknown as typeof cur.preferences,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId))
        .returning();
      const { defaultsVersion: _v, ...publicRow } = row;
      return { ...publicRow, isAdmin: isAdminUserId(this.config, userId) };
    });
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
