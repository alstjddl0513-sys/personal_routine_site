import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { companyTypes } from '../db/schema';
import type { CreateCompanyTypeDto } from './dto/create-company-type.dto';
import type { UpdateCompanyTypeDto } from './dto/update-company-type.dto';

@Injectable()
export class CompanyTypesService {
  async findAll() {
    return db
      .select()
      .from(companyTypes)
      .orderBy(asc(companyTypes.sortOrder), asc(companyTypes.createdAt));
  }

  async findOne(id: string) {
    const [row] = await db.select().from(companyTypes).where(eq(companyTypes.id, id)).limit(1);
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return row;
  }

  async create(dto: CreateCompanyTypeDto) {
    // Unique key는 DB 제약이 잡지만, 사용자 친화적인 메시지를 위해 사전 체크.
    const existing = await db
      .select({ id: companyTypes.id })
      .from(companyTypes)
      .where(eq(companyTypes.key, dto.key))
      .limit(1);
    if (existing.length) throw new ConflictException(`key "${dto.key}"가 이미 있음`);

    const [row] = await db.insert(companyTypes).values(dto).returning();
    return row;
  }

  async update(id: string, dto: UpdateCompanyTypeDto) {
    const [row] = await db
      .update(companyTypes)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companyTypes.id, id))
      .returning();
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return row;
  }

  async remove(id: string) {
    // Type 자체를 지워도 companies.type2는 text라 값이 남음. 삭제 = 그저
    // 목록에서 숨김. 필요하면 나중에 다시 add로 복원 가능.
    const [row] = await db
      .delete(companyTypes)
      .where(eq(companyTypes.id, id))
      .returning({ id: companyTypes.id });
    if (!row) throw new NotFoundException(`CompanyType ${id} not found`);
    return { id: row.id };
  }
}
