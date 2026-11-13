'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { getDocumentDownloadUrl } from '../../lib/api';
import { BUTTON_SECONDARY, POPOVER_CLOSE } from '../jobs/cells/popover-style';

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
        console.error(err);
        if (!cancelled) {
          setError('미리보기를 열지 못했어요. 잠시 후 다시 해보세요.');
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
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
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
          className="flex h-[92vh] w-full flex-col gap-3 overflow-hidden rounded-t-2xl bg-surface pt-3.5 pr-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-6 font-plex text-ink shadow-lg md:h-[calc(100vh-4rem)] md:max-w-220 md:rounded-lg md:pb-4"
        >
          <header className="flex items-center justify-between gap-2">
            <h2 id="doc-preview-title" className="min-w-0 truncate text-lg font-bold">
              {title}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className={`${BUTTON_SECONDARY} gap-1.5`}>
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  새 탭에서 열기
                </a>
              ) : null}
              <button type="button" onClick={onClose} aria-label="닫기" className={POPOVER_CLOSE.replace('-mr-2 ', '')}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>

          {/* PDF 보기 영역 — track 바탕, PDF는 브라우저 기본 뷰어(흰 종이 그대로) */}
          <div className="flex-1 overflow-hidden rounded-md bg-track">
            {error ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-alert">{error}</p>
              </div>
            ) : url ? (
              <iframe src={url} title={title} className="h-full w-full border-0" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
