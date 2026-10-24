import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, ilike, inArray, sql, SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { companies, documents } from '../db/schema';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { QueryCompaniesDto } from './dto/query-companies.dto';

// 슬롯별 허용 문서 kind. 포폴 슬롯은 PDF와 외부 링크(노션·깃헙 등) 둘 다.
const SLOT_KINDS = {
  resumeDocumentId: ['resume'],
  portfolioDocumentId: ['portfolio', 'link'],
} as const;

type DocumentSlot = keyof typeof SLOT_KINDS;

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
    await this.assertDocumentSlots(ownerId, dto);
    // is_rolling=true면 마감일은 개념상 의미 없으므로 강제 null.
    // 클라가 명시적으로 둘 다 넘긴 경우도 상시 우선.
    const [row] = await db
      .insert(companies)
      .values({
        ...dto,
        ownerId,
        ...(dto.isRolling === true ? { applicationDeadline: null } : {}),
      })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateCompanyDto) {
    // 자동 기록 판정을 위해 현재 row 로드. RLS/소유자 검증도 겸함.
    const current = await this.findOne(ownerId, id);
    await this.assertDocumentSlots(ownerId, dto);

    const patch: Record<string, unknown> = { ...dto, updatedAt: new Date() };

    // Auto-fill appliedAt: 클라가 명시 X + 현재 null + 지원 후 status 진입 시.
    // 시드나 backfill로 status만 뒤늦게 바뀌는 케이스도 커버(null && !=
    // not_applied면 fill). withdrawn은 not_applied가 아니라 걸리는데 실제로는
    // 이미 appliedAt이 있는 상태에서 오므로 자연스럽게 skip.
    if (
      dto.appliedAt === undefined &&
      current.appliedAt === null &&
      dto.applicationStatus !== undefined &&
      dto.applicationStatus !== 'not_applied'
    ) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      patch.appliedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    // 지원 시점 제출본 스냅샷: not_applied에서 처음 벗어날 때, 비어 있고
    // 클라가 명시하지 않은 슬롯을 그 시점 대표 문서로 채움. 나중에 대표를
    // 바꿔도 이 회사엔 그때 낸 버전이 남음. 포폴 슬롯은 PDF 대표만 사용
    // (link 대표는 깃헙 등일 수 있어 자동으론 안 넣음).
    if (
      current.applicationStatus === 'not_applied' &&
      dto.applicationStatus !== undefined &&
      dto.applicationStatus !== 'not_applied'
    ) {
      const fillResume =
        dto.resumeDocumentId === undefined && current.resumeDocumentId === null;
      const fillPortfolio =
        dto.portfolioDocumentId === undefined &&
        current.portfolioDocumentId === null;
      if (fillResume || fillPortfolio) {
        const actives = await db
          .select({ id: documents.id, kind: documents.kind })
          .from(documents)
          .where(
            and(
              eq(documents.ownerId, ownerId),
              eq(documents.isActive, true),
              inArray(documents.kind, ['resume', 'portfolio']),
            ),
          );
        const activeResume = actives.find((d) => d.kind === 'resume');
        const activePortfolio = actives.find((d) => d.kind === 'portfolio');
        if (fillResume && activeResume) {
          patch.resumeDocumentId = activeResume.id;
        }
        if (fillPortfolio && activePortfolio) {
          patch.portfolioDocumentId = activePortfolio.id;
        }
      }
    }

    // is_rolling=true로 전환하는 patch면 마감일 강제 null. 클라가 같이 명시하지
    // 않은 경우만 자동 clear(명시적 값이 있으면 사용자 선택 존중).
    if (dto.isRolling === true && dto.applicationDeadline === undefined) {
      patch.applicationDeadline = null;
    }

    const [row] = await db
      .update(companies)
      .set(patch)
      .where(and(eq(companies.id, id), eq(companies.ownerId, ownerId)))
      .returning();
    if (!row) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return row;
  }

  // 연결하려는 문서가 내 것이고 슬롯 kind와 맞는지. FK는 존재만 보장해서
  // 다른 사용자 문서 id를 넣는 걸 못 막음 → owner 조건으로 조회.
  private async assertDocumentSlots(
    ownerId: string,
    dto: Partial<Record<DocumentSlot, string | null>>,
  ): Promise<void> {
    for (const slot of Object.keys(SLOT_KINDS) as DocumentSlot[]) {
      const docId = dto[slot];
      if (!docId) continue; // undefined(변경 없음) 또는 null(해제)
      const [doc] = await db
        .select({ kind: documents.kind })
        .from(documents)
        .where(and(eq(documents.id, docId), eq(documents.ownerId, ownerId)))
        .limit(1);
      const allowed: readonly string[] = SLOT_KINDS[slot];
      if (!doc || !allowed.includes(doc.kind)) {
        throw new BadRequestException(`${slot}에 연결할 수 없는 문서예요.`);
      }
    }
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
