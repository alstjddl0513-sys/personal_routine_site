'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Document, DocumentKind } from '@repo/shared';
import { DocumentRow, formatSize } from './DocumentRow';
import { UploadButton, type UploadingFile } from './UploadButton';
import { LinkForm } from './LinkForm';
import { ListBody, ListCard, ListEmpty, ListError } from './lists/ListCard';

interface Props {
  kind: DocumentKind;
  title: string;
  description: string;
  /** 빈 상태 "아직 올린 이력서가 없어요." */
  emptyText: string;
  maxBytes?: number;
  rows: Document[];
}

// kind별 섹션 — 제목(17px) + 개수 · 설명 한 줄 → 흰 목록 카드.
// 올리기 오류는 카드 바로 위 한 줄, 올리는 동안은 목록 끝에 "올리는 중…" 줄.
export function DocumentSection({ kind, title, description, emptyText, maxBytes, rows }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingFile | null>(null);
  const showEmpty = rows.length === 0 && !uploading;
  // 서버는 대표를 맨 위로 보내지만, 여기선 최신순 고정 — 대표를 바꿀 때마다 줄이 자리를 바꾸면
  // 방금 누른 줄(키보드 포커스)이 다른 데로 튀어서. 대표는 라디오 · 뱃지로 보임.
  const ordered = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const hasActive = kind !== 'link' && rows.some((r) => r.isActive);
  // 대표를 지우면 대신 대표가 될 파일 — 남은 것 중 가장 최근(올리다 멈춘 파일 제외)
  const nextActive = (id: string) =>
    kind === 'link' ? null : ordered.find((r) => r.id !== id && !!r.storagePath) ?? null;

  // 새로 생긴 줄(올리기 · 링크 추가 뒤 refresh) 잠깐 강조 — 이전 목록과 비교(React 19 render 중 state 조정)
  const ids = rows.map((r) => r.id).join(',');
  const [prevIds, setPrevIds] = useState(ids);
  const [flashIds, setFlashIds] = useState<readonly string[]>([]);
  if (ids !== prevIds) {
    const before = new Set(prevIds.split(','));
    setFlashIds(rows.filter((r) => !before.has(r.id)).map((r) => r.id));
    setPrevIds(ids);
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-[17px] font-bold text-heading">
          {title}
          <span className="ml-1.5 text-[15px] font-medium text-ink-muted">{rows.length}개</span>
        </h2>
        <p className="text-[13px] text-ink-muted">{description}</p>
      </header>

      <ListError message={error} />

      <ListCard>
        {showEmpty ? <ListEmpty>{emptyText}</ListEmpty> : null}
        <ListBody>
          {ordered.map((row) => (
            <DocumentRow
              key={row.id}
              document={row}
              flash={flashIds.includes(row.id)}
              nextActive={row.isActive ? nextActive(row.id) : null}
            />
          ))}
          {uploading ? (
            <li>
              <div className="flex min-h-14 items-center gap-3 py-2">
                <span className="-ml-2.5 inline-flex h-10 w-10 shrink-0 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* 다 올라가면 제목이 확장자를 뺀 파일 이름이라 여기서도 같게 */}
                  <span className="truncate text-[15px] font-semibold text-ink-soft">
                    {uploading.name.replace(/\.pdf$/i, '')}
                  </span>
                  <span className="text-[13px] text-ink-muted">
                    PDF · {formatSize(uploading.size)} · 올리는 중…
                  </span>
                </div>
              </div>
            </li>
          ) : null}
        </ListBody>

        {kind === 'link' ? (
          <LinkForm />
        ) : maxBytes ? (
          <UploadButton
            kind={kind}
            maxBytes={maxBytes}
            title={title}
            onError={setError}
            onUploading={setUploading}
            makeActive={!hasActive}
          />
        ) : null}
      </ListCard>
    </section>
  );
}
