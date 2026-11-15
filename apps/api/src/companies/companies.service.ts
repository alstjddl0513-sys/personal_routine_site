import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNotNull, sql, SQL } from 'drizzle-orm';
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

// 실제로 지원서를 낸 상태인지. not_applied는 아직, withdrawn은 not_applied에서
// 바로 오면 "지원 안 하기로 함"이라 둘 다 제출 기록·지원일 자동 채움 대상 X.
function isSubmittedStatus(status: string | undefined): boolean {
  return (
    status !== undefined && status !== 'not_applied' && status !== 'withdrawn'
  );
}

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
    // 이미 지원한 상태로 추가하는 회사도 그 시점 대표 문서를 제출본으로 기록.
    const snapshot = isSubmittedStatus(dto.applicationStatus)
      ? await this.snapshotDocuments(ownerId, {
          fillResume: dto.resumeDocumentId === undefined,
          fillPortfolio: dto.portfolioDocumentId === undefined,
        })
      : {};
    // is_rolling=true면 마감일은 개념상 의미 없으므로 강제 null.
    // 클라가 명시적으로 둘 다 넘긴 경우도 상시 우선.
    const [row] = await db
      .insert(companies)
      .values({
        ...dto,
        ...snapshot,
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
    // 시드나 backfill로 status만 뒤늦게 바뀌는 케이스도 커버(null && 제출
    // 상태면 fill). withdrawn은 제외 — 지원 후 취소면 appliedAt이 이미 있고,
    // not_applied에서 바로 오면 지원한 적이 없음.
    if (
      dto.appliedAt === undefined &&
      current.appliedAt === null &&
      isSubmittedStatus(dto.applicationStatus)
    ) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      patch.appliedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    // 지원 시점 제출본 스냅샷: not_applied에서 처음 제출 상태로 갈 때, 비어
    // 있고 클라가 명시하지 않은 슬롯을 그 시점 대표 문서로 채움. 나중에 대표를
    // 바꿔도 이 회사엔 그때 낸 버전이 남음.
    if (
      current.applicationStatus === 'not_applied' &&
      isSubmittedStatus(dto.applicationStatus)
    ) {
      Object.assign(
        patch,
        await this.snapshotDocuments(ownerId, {
          fillResume:
            dto.resumeDocumentId === undefined &&
            current.resumeDocumentId === null,
          fillPortfolio:
            dto.portfolioDocumentId === undefined &&
            current.portfolioDocumentId === null,
        }),
      );
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

  // 채울 슬롯에 현재 대표 문서 id를 담아 반환. 포폴 슬롯은 PDF 대표만 사용
  // (link 대표는 깃헙 등일 수 있어 자동으론 안 넣음). 업로드가 안 끝난
  // (storage_path 없는) 문서는 열 수 없어서 제외.
  private async snapshotDocuments(
    ownerId: string,
    {
      fillResume,
      fillPortfolio,
    }: { fillResume: boolean; fillPortfolio: boolean },
  ): Promise<Partial<Record<DocumentSlot, string>>> {
    if (!fillResume && !fillPortfolio) return {};
    const actives = await db
      .select({ id: documents.id, kind: documents.kind })
      .from(documents)
      .where(
        and(
          eq(documents.ownerId, ownerId),
          eq(documents.isActive, true),
          inArray(documents.kind, ['resume', 'portfolio']),
          isNotNull(documents.storagePath),
        ),
      );
    const activeResume = actives.find((d) => d.kind === 'resume');
    const activePortfolio = actives.find((d) => d.kind === 'portfolio');
    const result: Partial<Record<DocumentSlot, string>> = {};
    if (fillResume && activeResume) result.resumeDocumentId = activeResume.id;
    if (fillPortfolio && activePortfolio) {
      result.portfolioDocumentId = activePortfolio.id;
    }
    return result;
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
