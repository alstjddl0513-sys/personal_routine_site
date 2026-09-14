import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { questionCategories } from '../db/schema';
import type { CreateQuestionCategoryDto } from './dto/create-question-category.dto';
import type { UpdateQuestionCategoryDto } from './dto/update-question-category.dto';

@Injectable()
export class QuestionCategoriesService {
  async findAll(ownerId: string) {
    return db
      .select()
      .from(questionCategories)
      .where(eq(questionCategories.ownerId, ownerId))
      .orderBy(asc(questionCategories.sortOrder), asc(questionCategories.createdAt));
  }

  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select()
      .from(questionCategories)
      .where(and(eq(questionCategories.id, id), eq(questionCategories.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException(`QuestionCategory ${id} not found`);
    return row;
  }

  async create(ownerId: string, dto: CreateQuestionCategoryDto) {
    // (owner_id, key) UNIQUE는 DB가 잡지만 사용자 친화 메시지를 위해 사전 체크.
    const existing = await db
      .select({ id: questionCategories.id })
      .from(questionCategories)
      .where(and(eq(questionCategories.key, dto.key), eq(questionCategories.ownerId, ownerId)))
      .limit(1);
    if (existing.length) throw new ConflictException(`key "${dto.key}"가 이미 있음`);

    const [row] = await db
      .insert(questionCategories)
      .values({ ...dto, ownerId })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateQuestionCategoryDto) {
    const [row] = await db
      .update(questionCategories)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(questionCategories.id, id), eq(questionCategories.ownerId, ownerId)))
      .returning();
    if (!row) throw new NotFoundException(`QuestionCategory ${id} not found`);
    return row;
  }

  async remove(ownerId: string, id: string) {
    // 삭제해도 questions.category_key는 text 그대로 남음(FK 없음). 목록에서만 숨김.
    const [row] = await db
      .delete(questionCategories)
      .where(and(eq(questionCategories.id, id), eq(questionCategories.ownerId, ownerId)))
      .returning({ id: questionCategories.id });
    if (!row) throw new NotFoundException(`QuestionCategory ${id} not found`);
    return { id: row.id };
  }
}
