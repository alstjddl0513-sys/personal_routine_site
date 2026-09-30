'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, ExternalLink, Trash2 } from 'lucide-react';
import type { Document } from '@repo/shared';
import {
  deleteDocument,
  getDocumentDownloadUrl,
  patchDocument,
} from '../../lib/api';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface Props {
  document: Document;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 리스트 아이템 하나. 라디오로 대표 선택 + 다운로드/열기 + 삭제.
// 삭제는 confirm 없이 바로 (다른 페이지들도 confirm 없는 게 다수).
export function DocumentRow({ document }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleSelectActive() {
    if (document.isActive) return; // 이미 대표
    startTransition(async () => {
      try {
        await patchDocument(document.id, { isActive: true });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteDocument(document.id);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  async function handleOpen() {
    if (document.kind === 'link' && document.url) {
      window.open(document.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloading(true);
    try {
      const { url } = await getDocumentDownloadUrl(document.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  const isLink = document.kind === 'link';
  // 파일 kind인데 storagePath가 없으면 업로드 실패한 orphan row로 취급.
  const isOrphan = !isLink && !document.storagePath;

  return (
    <li className="flex items-center gap-3 py-2">
      <label className="inline-flex cursor-pointer items-center">
        <input
          type="radio"
          name={`active-${document.kind}`}
          checked={document.isActive}
          onChange={handleSelectActive}
          disabled={pending || isOrphan}
          className="h-4 w-4 accent-blue-600"
          aria-label="대표로 지정"
        />
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {document.title}
          </span>
          {document.isActive ? (
            <span className="inline-flex shrink-0 items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              대표
            </span>
          ) : null}
          {isOrphan ? (
            <span className="inline-flex shrink-0 items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              업로드 미완료
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
          {isLink
            ? document.url
            : `${document.fileMime ?? 'PDF'} · ${formatSize(document.fileSize)}`}
        </p>
      </div>

      {isLink || isOrphan ? null : (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          title="미리보기"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Eye className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={handleOpen}
        disabled={downloading || isOrphan}
        title={isLink ? '외부 링크 열기' : '새 탭에서 다운로드'}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        {isLink ? (
          <ExternalLink className="h-4 w-4" aria-hidden />
        ) : (
          <Download className="h-4 w-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title="삭제"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      {previewOpen ? (
        <DocumentPreviewModal
          documentId={document.id}
          title={document.title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </li>
  );
}
