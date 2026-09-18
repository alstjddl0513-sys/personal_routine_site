import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { documents } from '../db/schema';
import { getSupabaseAdmin } from '../supabase-admin';
import { InitDocumentDto } from './dto/init-document.dto';
import { CreateLinkDocumentDto } from './dto/create-link-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { DocumentKind } from './dto/enums';

const BUCKET = 'documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1시간
const MAX_BYTES_BY_KIND: Record<'resume' | 'portfolio', number> = {
  resume: 10 * 1024 * 1024,
  portfolio: 50 * 1024 * 1024,
};

@Injectable()
export class DocumentsService {
  async findAll(ownerId: string, query: QueryDocumentsDto) {
    const conditions = [eq(documents.ownerId, ownerId)];
    if (query.kind) conditions.push(eq(documents.kind, query.kind));
    return db
      .select()
      .from(documents)
      .where(and(...conditions))
      // 대표 문서를 위로, 그 다음 최신순
      .orderBy(desc(documents.isActive), desc(documents.createdAt), asc(documents.id));
  }

  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Document ${id} not found`);
    return row;
  }

  // 2단계 업로드 1단계: DB row insert + Supabase Storage signed upload URL.
  // 클라는 반환된 uploadUrl에 PUT으로 파일 업로드하면 됨. 실패해도 orphan
  // row는 남아 사용자가 목록에서 확인 후 수동 삭제 가능.
  async init(ownerId: string, dto: InitDocumentDto) {
    const maxBytes = MAX_BYTES_BY_KIND[dto.kind];
    if (dto.fileSize > maxBytes) {
      throw new BadRequestException(
        `${dto.kind} 파일은 ${Math.round(maxBytes / 1024 / 1024)}MB 이하만 업로드할 수 있어요.`,
      );
    }

    const docId = randomUUID();
    // 경로: {owner_id}/{kind}/{document_id}.pdf. Storage RLS가 첫 세그먼트로
    // owner 확인함(storage.foldername(name)[1] == auth.uid()).
    const path = `${ownerId}/${dto.kind}/${docId}.pdf`;

    const [row] = await db
      .insert(documents)
      .values({
        id: docId,
        ownerId,
        kind: dto.kind,
        title: dto.title,
        storagePath: path,
        fileSize: dto.fileSize,
        fileMime: dto.fileMime,
      })
      .returning();

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      // 실패해도 row는 남아 있음(orphan). 사용자가 목록에서 삭제할 수 있음.
      throw new InternalServerErrorException(
        `signed upload URL 발급 실패: ${error?.message ?? 'unknown'}`,
      );
    }

    return {
      document: row,
      uploadUrl: data.signedUrl,
      token: data.token,
      path,
    };
  }

  async createLink(ownerId: string, dto: CreateLinkDocumentDto) {
    const [row] = await db
      .insert(documents)
      .values({
        ownerId,
        kind: DocumentKind.LINK,
        title: dto.title,
        url: dto.url,
        notes: dto.notes,
      })
      .returning();
    return row;
  }

  // isActive=true PATCH면 트랜잭션에서 같은 kind의 나머지를 false로.
  // Postgres partial unique index (documents_one_active_per_kind)가 최후
  // 방어. 부분 인덱스라 여러 row가 동시에 true면 위반.
  async update(ownerId: string, id: string, dto: UpdateDocumentDto) {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
        .limit(1);
      if (!current) throw new NotFoundException(`Document ${id} not found`);

      // isActive=true로 만들 때: 같은 kind의 다른 row 모두 false로.
      // 대상 row는 아래 UPDATE에서 true로 세팅되므로 여기선 나머지만.
      if (dto.isActive === true && !current.isActive) {
        await tx
          .update(documents)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(eq(documents.ownerId, ownerId), eq(documents.kind, current.kind)),
          );
      }

      const patch: Record<string, unknown> = { ...dto, updatedAt: new Date() };
      // url은 link kind만 유효. 파일 kind에 넘어오면 무시.
      if (current.kind !== 'link') delete patch.url;

      const [row] = await tx
        .update(documents)
        .set(patch)
        .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
        .returning();
      return row;
    });
  }

  // Storage 먼저 → DB 순. Storage 실패 시 재시도 경로 유지 (DB row 남음).
  // storagePath가 null(link kind)이거나 Storage에 파일이 없는 경우 정상 취급.
  async remove(ownerId: string, id: string) {
    const current = await this.findOne(ownerId, id);

    if (current.storagePath) {
      const admin = getSupabaseAdmin();
      const { error } = await admin.storage
        .from(BUCKET)
        .remove([current.storagePath]);
      // `not_found`는 이미 지워졌거나 orphan row(업로드 실패)라 정상 취급.
      // 그 외 오류는 재시도 유도.
      if (error && !/not.?found/i.test(error.message)) {
        throw new InternalServerErrorException(
          `Storage 파일 삭제 실패: ${error.message}`,
        );
      }
    }

    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)));
    return { id };
  }

  // Signed download URL — 60분 만료. 링크 kind는 storage_path 없으므로 400.
  // 링크는 클라가 url 필드를 직접 새 탭에 열면 됨.
  async createDownloadUrl(ownerId: string, id: string) {
    const current = await this.findOne(ownerId, id);
    if (!current.storagePath) {
      throw new BadRequestException(
        '외부 링크는 다운로드 URL이 없어요. url 필드를 직접 여세요.',
      );
    }
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(current.storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      throw new InternalServerErrorException(
        `signed URL 발급 실패: ${error?.message ?? 'unknown'}`,
      );
    }
    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();
    return { url: data.signedUrl, expiresAt };
  }
}
