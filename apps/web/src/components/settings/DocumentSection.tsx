'use client';

import type { Document, DocumentKind } from '@repo/shared';
import { DocumentRow } from './DocumentRow';
import { UploadButton } from './UploadButton';
import { LinkForm } from './LinkForm';

interface Props {
  kind: DocumentKind;
  title: string;
  description: string;
  maxBytes?: number;
  rows: Document[];
}

// kind별 섹션. 헤더 + 리스트 + 하단 액션(업로드 or 링크 추가).
export function DocumentSection({
  kind,
  title,
  description,
  maxBytes,
  rows,
}: Props) {
  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {title}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {rows.length}개
              {activeCount > 0 ? ' · 대표 1' : ''}
            </span>
          </h2>
          <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
          아직 등록된 항목이 없어요.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <DocumentRow key={row.id} document={row} />
          ))}
        </ul>
      )}

      <div className="mt-3">
        {kind === 'link' ? (
          <LinkForm />
        ) : maxBytes ? (
          <UploadButton kind={kind} maxBytes={maxBytes} title={title} />
        ) : null}
      </div>
    </section>
  );
}
