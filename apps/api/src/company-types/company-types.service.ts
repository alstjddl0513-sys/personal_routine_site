import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { companyTypes } from '../db/schema';
import type { CreateCompanyTypeDto } from './dto/create-company-type.dto';
import type { UpdateCompanyTypeDto } from './dto/update-company-type.dto';

@Injectable()
export class CompanyTypesService {
  async findAll(ownerId: string) {
    return db
      .select()
      .from(companyTypes)
      .where(eq(companyTypes.ownerId, ownerId))
      .orderBy(asc(companyTypes.sortOrder), asc(companyTypes.createdAt));
  }

  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select()
      .from(companyTypes)
      .where(and(eq(companyTypes.id, id), eq(companyTypes.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return row;
  }

  async create(ownerId: string, dto: CreateCompanyTypeDto) {
    // Unique key는 DB 제약이 잡지만 (commit D 이후 (owner_id, key) composite),
    // 사용자 친화적인 메시지를 위해 사전 체크. 같은 owner 안에서만 중복 검사.
    const existing = await db
      .select({ id: companyTypes.id })
      .from(companyTypes)
      .where(and(eq(companyTypes.key, dto.key), eq(companyTypes.ownerId, ownerId)))
      .limit(1);
    if (existing.length) throw new ConflictException(`key "${dto.key}"가 이미 있음`);

    const [row] = await db
      .insert(companyTypes)
      .values({ ...dto, ownerId })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateCompanyTypeDto) {
    const [row] = await db
      .update(companyTypes)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(companyTypes.id, id), eq(companyTypes.ownerId, ownerId)))
      .returning();
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return row;
  }

  async remove(ownerId: string, id: string) {
    // Type 자체를 지워도 companies.type2는 text라 값이 남음. 삭제 = 그저
    // 목록에서 숨김. 필요하면 나중에 다시 add로 복원 가능.
    const [row] = await db
      .delete(companyTypes)
      .where(and(eq(companyTypes.id, id), eq(companyTypes.ownerId, ownerId)))
      .returning({ id: companyTypes.id });
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return { id: row.id };
  }
}
