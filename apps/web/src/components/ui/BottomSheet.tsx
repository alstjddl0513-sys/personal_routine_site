'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { X } from 'lucide-react';
import { Portal } from './Portal';
import { POPOVER_CLOSE } from '../jobs/cells/popover-style';
import { FOCUS_RING } from '../settings/lists/ListCard';

const ANIM_MS = 180;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// 손잡이 · 제목 줄을 이만큼 넘게 아래로 끌면 닫힘
const SWIPE_CLOSE_PX = 60;

// 모바일 바텀시트 공용(docs/design/rally-mobile-shell · rally-mobile-jobs).
// scrim + 아래 붙는 시트(위 둥근 16px · 손잡이 · 제목 17px + ✕ 44px) · 내용 스크롤 · footer 줄.
// 닫기: ✕ · scrim · Esc · 손잡이/제목 줄을 아래로 끌기. 열려 있는 동안 뒤 스크롤 잠금 · Tab은 시트 안에서만,
// 닫히면 열기 전 자리로 포커스. 열고 닫을 때 아래에서 올라오고 내려감.
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  tall,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** 시트 아래 고정 줄(버튼 등) — 내용이 스크롤돼도 남음 */
  footer?: ReactNode;
  /** 위 64px만 남기고 높이 고정(필터처럼 내용이 긴 시트) */
  tall?: boolean;
  /** 시트 상자에 더할 클래스(예: md:hidden) */
  className?: string;
}) {
  const labelId = useId();

  // 닫힐 때 바로 안 지우고 내려가는 애니메이션 뒤에
  const [prevOpen, setPrevOpen] = useState(open);
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setShown(true);
      setClosing(false);
    } else if (shown) {
      setClosing(true);
    }
  }
  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => {
      setShown(false);
      setClosing(false);
    }, reduce ? 0 : ANIM_MS);
    return () => window.clearTimeout(t);
  }, [closing]);

  // 최신 onClose를 effect 밖에서 읽음 — 부모가 렌더마다 새 함수를 넘겨도 포커스 · 잠금이 다시 걸리지 않게
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const els = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      returnTo?.focus();
    };
  }, [open]);

  // 아래로 끌어 닫기 — 끄는 동안 시트가 손가락을 따라 내려감
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  function onTouchStart(e: TouchEvent) {
    startY.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchMove(e: TouchEvent) {
    if (startY.current === null) return;
    const dy = (e.touches[0]?.clientY ?? startY.current) - startY.current;
    setDragY(Math.max(0, dy));
  }
  function onTouchEnd() {
    const dy = dragY;
    startY.current = null;
    setDragY(0);
    if (dy > SWIPE_CLOSE_PX) onClose();
  }

  if (!shown) return null;

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/30 motion-reduce:animate-none dark:bg-black/50 ${className} ${
          closing ? 'animate-[fade-out_180ms_ease-in_forwards]' : 'animate-[fade-in_180ms_ease-out]'
        }`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-surface pb-[calc(env(safe-area-inset-bottom)+10px)] font-plex text-[15px] text-ink shadow-[0_-4px_24px_rgba(28,31,29,0.14)] motion-reduce:animate-none ${
          tall ? 'h-[calc(100dvh-64px)]' : 'max-h-[calc(100dvh-64px)]'
        } ${className} ${closing ? 'animate-[sheet-out_180ms_ease-in_forwards]' : 'animate-[sheet-in_180ms_ease-out]'}`}
      >
        {/* 손잡이 + 제목 줄 = 끌어 닫는 자리 */}
        <div
          className="flex-none touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <header className="flex items-center justify-between gap-2 pt-2 pr-2 pl-5">
            <h2 id={labelId} className="min-w-0 truncate text-[17px] font-bold">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className={`${POPOVER_CLOSE.replace('-mr-2 ', '').replace('h-10 w-10', 'h-11 w-11')} ${FOCUS_RING}`}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="flex-none border-t border-divider px-5 pt-3">{footer}</div> : null}
      </div>
    </Portal>
  );
}
