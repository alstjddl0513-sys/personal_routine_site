import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, sql, SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { companies } from '../db/schema';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { QueryCompaniesDto } from './dto/query-companies.dto';

@Injectable()
export class CompaniesService {
  async findAll(query: QueryCompaniesDto) {
    const conditions: SQL[] = [];

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
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(priorityOrder, asc(companies.name));
  }

  async findOne(id: string) {
    const [row] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return row;
  }

  async create(dto: CreateCompanyDto) {
    const [row] = await db.insert(companies).values(dto).returning();
    return row;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const [row] = await db
      .update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return row;
  }

  async remove(id: string) {
    const [row] = await db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning({ id: companies.id });
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return { id: row.id };
  }
}
