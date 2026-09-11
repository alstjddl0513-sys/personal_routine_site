import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, sql, SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { companies } from '../db/schema';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { QueryCompaniesDto } from './dto/query-companies.dto';

@Injectable()
export class CompaniesService {
  async findAll(ownerId: string, query: QueryCompaniesDto) {
    const conditions: SQL[] = [eq(companies.ownerId, ownerId)];

    if (query.type1) {
      conditions.push(eq(companies.type1, query.type1));
    }
    if (query.isHiring !== undefined) {
      conditions.push(eq(companies.isHiring, query.isHiring));
    }
    if (query.isFavorite !== undefined) {
      conditions.push(eq(companies.isFavorite, query.isFavorite));
    }
    if (query.search) {
      conditions.push(ilike(companies.name, `%${query.search}%`));
    }

    // priority: urgent > important > normal
    const priorityOrder = sql`case ${companies.priority}
      when 'urgent' then 0
      when 'important' then 1
      when 'normal' then 2
    end`;

    return db
      .select()
      .from(companies)
      .where(and(...conditions))
      .orderBy(priorityOrder, asc(companies.name));
  }

  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.ownerId, ownerId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return row;
  }

  async create(ownerId: string, dto: CreateCompanyDto) {
    const [row] = await db
      .insert(companies)
      .values({ ...dto, ownerId })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateCompanyDto) {
    const [row] = await db
      .update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(companies.id, id), eq(companies.ownerId, ownerId)))
      .returning();
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return row;
  }

  async remove(ownerId: string, id: string) {
    const [row] = await db
      .delete(companies)
      .where(and(eq(companies.id, id), eq(companies.ownerId, ownerId)))
      .returning({ id: companies.id });
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return { id: row.id };
  }
}
