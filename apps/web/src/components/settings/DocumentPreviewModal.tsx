'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { getDocumentDownloadUrl } from '../../lib/api';

interface Props {
  documentId: string;
  title: string;
  onClose: () => void;
}

// 파일 kind용 미리보기 모달. 열릴 때 signed URL(60분 TTL) 발급해서 iframe으로
// 브라우저 native PDF viewer에 렌더. iOS Safari 등 iframe PDF 미지원 브라우저를
// 위해 "새 탭에서 열기" fallback 링크를 header에 상시 노출.
export function DocumentPreviewModal({ documentId, title, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDocumentDownloadUrl(documentId);
        if (!cancelled) setUrl(res.url);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '미리보기 준비에 실패했어요.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-preview-title"
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-lg pb-[env(safe-area-inset-bottom)] md:h-[calc(100vh-4rem)] md:max-w-4xl md:rounded-lg md:pb-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300 md:hidden dark:bg-zinc-700"
          />
          <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2
              id="doc-preview-title"
              className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200"
            >
              {title}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="새 탭에서 열기"
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  새 탭
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            {error ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            ) : url ? (
              <iframe
                src={url}
                title={title}
                className="h-full w-full border-0 bg-white dark:bg-zinc-950"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
