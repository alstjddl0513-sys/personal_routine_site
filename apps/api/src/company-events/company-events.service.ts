import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, between, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { companies, companyEvents } from '../db/schema';
import type { CreateCompanyEventDto } from './dto/create-company-event.dto';
import type { UpdateCompanyEventDto } from './dto/update-company-event.dto';
import type { QueryCompanyEventsDto } from './dto/query-events.dto';

@Injectable()
export class CompanyEventsService {
  async findAll(ownerId: string, query: QueryCompanyEventsDto) {
    const conds = [eq(companyEvents.ownerId, ownerId)];
    if (query.companyId) {
      conds.push(eq(companyEvents.companyId, query.companyId));
    }
    if (query.from && query.to) {
      conds.push(between(companyEvents.date, query.from, query.to));
    } else if (query.from) {
      conds.push(between(companyEvents.date, query.from, '9999-12-31'));
    } else if (query.to) {
      conds.push(between(companyEvents.date, '0001-01-01', query.to));
    }
    return db
      .select({
        id: companyEvents.id,
        companyId: companyEvents.companyId,
        date: companyEvents.date,
        type: companyEvents.type,
        note: companyEvents.note,
        createdAt: companyEvents.createdAt,
        updatedAt: companyEvents.updatedAt,
      })
      .from(companyEvents)
      .where(and(...conds))
      .orderBy(asc(companyEvents.date));
  }

  async create(ownerId: string, dto: CreateCompanyEventDto) {
    // Verify the company belongs to this owner before inserting.
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(eq(companies.id, dto.companyId), eq(companies.ownerId, ownerId)),
      )
      .limit(1);
    if (!company) {
      throw new BadRequestException(
        `Company ${dto.companyId} not found or not owned by user`,
      );
    }
    const [row] = await db
      .insert(companyEvents)
      .values({
        ownerId,
        companyId: dto.companyId,
        date: dto.date,
        type: dto.type,
        note: dto.note ?? null,
      })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateCompanyEventDto) {
    const [row] = await db
      .update(companyEvents)
      .set({ ...dto, updatedAt: new Date() })
      .where(
        and(eq(companyEvents.id, id), eq(companyEvents.ownerId, ownerId)),
      )
      .returning();
    if (!row) {
      throw new NotFoundException(`CompanyEvent ${id} not found`);
    }
    return row;
  }

  async remove(ownerId: string, id: string) {
    const [row] = await db
      .delete(companyEvents)
      .where(
        and(eq(companyEvents.id, id), eq(companyEvents.ownerId, ownerId)),
      )
      .returning({ id: companyEvents.id });
    if (!row) {
      throw new NotFoundException(`CompanyEvent ${id} not found`);
    }
    return { id: row.id };
  }
}
