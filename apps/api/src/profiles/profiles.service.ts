import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { profiles } from '../db/schema';

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

  // Create-if-missing, else rename to the given nickname. Used by /signup to
  // stamp the profile row right after Supabase signUp succeeds.
  async upsertMe(userId: string, nickname: string) {
    try {
      const [row] = await db
        .insert(profiles)
        .values({ id: userId, nickname })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { nickname, updatedAt: new Date() },
        })
        .returning();
      return row;
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
