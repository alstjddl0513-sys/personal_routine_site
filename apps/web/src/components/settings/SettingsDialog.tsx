'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { POPOVER_CLOSE } from '../jobs/cells/popover-style';

// 설정 창 공통 — 흰 바탕 radius 8, 제목 20px 700 + ✕. Esc · 바깥 클릭으로 닫힘(busy면 막음),
// 열린 동안 뒤 화면 스크롤 잠금. 모바일은 아래에서 올라오는 모양.
export function SettingsDialog({
  open,
  title,
  labelId,
  onClose,
  busy,
  widthClass = 'md:max-w-130',
  children,
}: {
  open: boolean;
  title: string;
  labelId: string;
  onClose: () => void;
  busy?: boolean;
  /** md 이상 최대 폭(기본 520px) */
  widthClass?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;
  return (
    <Portal>
      <div aria-hidden className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <div
          className={`flex max-h-[85vh] w-full flex-col gap-4.5 overflow-y-auto rounded-t-2xl bg-surface px-7 pt-5.5 pb-6 font-plex text-[15px] text-ink shadow-lg md:max-h-[calc(100vh-2rem)] md:rounded-lg ${widthClass}`}
        >
          <header className="-mr-2.5 flex items-center justify-between gap-2">
            <h2 id={labelId} className="text-xl font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="닫기"
              className={POPOVER_CLOSE.replace('-mr-2 ', '')}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
          {children}
        </div>
      </div>
    </Portal>
  );
}
