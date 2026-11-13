'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, Eye, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import type { Document } from '@repo/shared';
import {
  deleteDocument,
  getDocumentDownloadUrl,
  patchDocument,
} from '../../lib/api';
import { ListConfirmDialog } from './lists/ListConfirmDialog';
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

const ICON_BTN =
  'inline-flex h-10 w-10 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

// 문서 한 줄. 파일(이력서 · 포트폴리오)은 대표 라디오 + 미리보기 · 다운로드 · 이름 고치기 · 삭제,
// 링크는 대표가 없음(회사 제출본으로 연결되는 건 파일뿐) — 열기 · 이름 고치기 · 삭제.
// 삭제는 늘 확인 창(파일이 영구히 지워짐). 제출 기록이 있으면 본문에 그 결과도.
// 실패는 줄 아래 한 줄로 알림(전엔 콘솔에만 찍혀 눌러도 아무 일 없어 보였음).
export function DocumentRow({ document }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedCount = document.submittedCount ?? 0;

  const isLink = document.kind === 'link';
  // 파일 kind인데 storagePath가 없으면 올리다 멈춘 row로 취급 — 지우기만 가능.
  const isOrphan = !isLink && !document.storagePath;

  function handleSelectActive() {
    if (document.isActive) return; // 이미 대표
    setError(null);
    startTransition(async () => {
      try {
        await patchDocument(document.id, { isActive: true });
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('대표로 바꾸지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function saveTitle() {
    if (editTitle === null) return;
    const t = editTitle.trim();
    if (!t) {
      setError('이름을 입력하세요.');
      return;
    }
    if (t === document.title) {
      setEditTitle(null);
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await patchDocument(document.id, { title: t });
        setEditTitle(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('이름을 바꾸지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteDocument(document.id);
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setConfirmOpen(false);
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  async function handleOpen() {
    setError(null);
    if (isLink && document.url) {
      window.open(document.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloading(true);
    try {
      const { url } = await getDocumentDownloadUrl(document.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      setError('파일을 열지 못했어요. 잠시 후 다시 해보세요.');
    } finally {
      setDownloading(false);
    }
  }

  const deleteBody = isLink
    ? '목록에서 지워져요. 되돌릴 수 없어요.'
    : submittedCount > 0
      ? `파일이 영구히 지워져요. ${submittedCount}곳에 제출했어요 — 지우면 그 회사들의 제출 기록에서도 빠져요.`
      : '파일이 영구히 지워져요. 되돌릴 수 없어요.';

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center gap-3">
        {isLink ? null : (
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="radio"
              name={`active-${document.kind}`}
              checked={document.isActive}
              onChange={handleSelectActive}
              disabled={pending || isOrphan}
              className="h-4 w-4 accent-blue-600"
              aria-label={`${document.title} 대표로 정하기`}
            />
          </label>
        )}

        {editTitle !== null ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                  setEditTitle(null);
                  setError(null);
                }
              }}
              maxLength={200}
              disabled={pending}
              autoFocus
              aria-label={`${document.title} 이름`}
              className="min-h-10 min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button type="button" onClick={saveTitle} disabled={pending} aria-label="저장 (Enter)" title="저장 (Enter)" className={ICON_BTN}>
              <Check className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(null);
                setError(null);
              }}
              disabled={pending}
              aria-label="취소 (Esc)"
              title="취소 (Esc)"
              className={ICON_BTN}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate text-sm font-medium ${isOrphan ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                  {document.title}
                </span>
                {document.isActive && !isLink ? (
                  <span className="inline-flex shrink-0 items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    대표
                  </span>
                ) : null}
                {isOrphan ? (
                  <span className="inline-flex shrink-0 items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    올리다 멈춘 파일
                  </span>
                ) : null}
                {submittedCount > 0 ? (
                  <span className="inline-flex shrink-0 items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {submittedCount}곳 제출
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
                {isLink ? document.url : `PDF · ${formatSize(document.fileSize)}`}
              </p>
            </div>

            {isLink || isOrphan ? null : (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                aria-label={`${document.title} 미리보기`}
                title="미리보기"
                className={ICON_BTN}
              >
                <Eye className="h-4 w-4" aria-hidden />
              </button>
            )}
            {isOrphan ? null : (
              <button
                type="button"
                onClick={handleOpen}
                disabled={downloading}
                aria-label={isLink ? `${document.title} 열기` : `${document.title} 다운로드`}
                title={isLink ? '새 탭에서 열기' : '다운로드'}
                className={ICON_BTN}
              >
                {isLink ? <ExternalLink className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              </button>
            )}
            {isOrphan ? null : (
              <button
                type="button"
                onClick={() => {
                  setEditTitle(document.title);
                  setError(null);
                }}
                disabled={pending}
                aria-label={`${document.title} 이름 고치기`}
                title="이름 고치기"
                className={ICON_BTN}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmOpen(true);
              }}
              disabled={pending}
              aria-label={`${document.title} 삭제`}
              title="삭제"
              className={ICON_BTN}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-alert">
          {error}
        </p>
      ) : null}

      {previewOpen ? (
        <DocumentPreviewModal
          documentId={document.id}
          title={document.title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      <ListConfirmDialog
        open={confirmOpen}
        title={`'${document.title}'을(를) 삭제할까요?`}
        body={deleteBody}
        confirmLabel={pending ? '삭제 중…' : '삭제'}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}
