'use client';

import { useEffect, useRef, useState, type TouchEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, ChevronRight, Rss, Settings, X, type LucideIcon } from 'lucide-react';
import { Portal } from './ui/Portal';
import { ThemeSegment } from './settings/ThemeSegment';
import { POPOVER_CLOSE } from './jobs/cells/popover-style';
import { FOCUS_RING } from './settings/lists/ListCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
}

const MORE_ITEMS: MoreItem[] = [
  { href: '/calendar', label: '캘린더', icon: Calendar, matchPrefixes: ['/calendar'] },
  { href: '/blog', label: '블로그', icon: Rss, matchPrefixes: ['/blog'] },
  {
    href: '/settings',
    label: '설정',
    icon: Settings,
    matchPrefixes: ['/settings'],
  },
];

const ANIM_MS = 180;
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
// 손잡이 · 제목 줄을 이만큼 넘게 아래로 끌면 닫힘
const SWIPE_CLOSE_PX = 60;

function isActive(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// BottomNav의 '⋯ 더보기' 탭에서 열리는 바텀시트(docs/design/rally-mobile-shell*.html).
// 메인 5탭에 못 넣은 캘린더 · 블로그 · 설정 + 테마. 하단 탭은 시트 뒤에 그대로(scrim이 덮음).
// 닫기: ✕ · scrim · Esc · 손잡이/제목 줄을 아래로 끌기. 열려 있는 동안 뒤 스크롤 잠금 · Tab은 시트 안에서만.
export function MoreMenu({ open, onClose }: Props) {
  const pathname = usePathname();

  // 닫힐 때 바로 안 지우고 내려가는 애니메이션 뒤에(NotifLogDrawer와 같은 방식)
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

  // 포커스: 열면 ✕로, Tab은 시트 안에서만, 닫히면 열기 전 자리(더보기 탭)로
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
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
  }, [open, onClose]);

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
        className={`fixed inset-0 z-50 bg-black/30 motion-reduce:animate-none md:hidden dark:bg-black/50 ${
          closing ? 'animate-[fade-out_180ms_ease-in_forwards]' : 'animate-[fade-in_180ms_ease-out]'
        }`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="더보기 메뉴"
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-surface pb-[calc(env(safe-area-inset-bottom)+14px)] font-plex text-ink shadow-[0_-4px_24px_rgba(28,31,29,0.14)] motion-reduce:animate-none md:hidden ${
          closing ? 'animate-[sheet-out_180ms_ease-in_forwards]' : 'animate-[sheet-in_180ms_ease-out]'
        }`}
      >
        {/* 손잡이 + 제목 줄 = 끌어 닫는 자리 */}
        <div className="touch-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <header className="flex items-center justify-between pt-2 pr-2 pl-5">
            <h2 className="text-[17px] font-bold">더보기</h2>
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

        {/* 항목 사이 divider — 활성(chip-on 배경) 줄 앞뒤는 배경이 구분해서 선 없음 */}
        <ul className="flex flex-col gap-px px-3 pt-1 pb-2 [&>li+li]:border-t [&>li+li]:border-divider [&>li:has([aria-current])]:border-transparent [&>li:has([aria-current])+li]:border-transparent">
          {MORE_ITEMS.map((item) => {
            const active = isActive(pathname, item.matchPrefixes);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] ${FOCUS_RING} ${
                    active ? 'bg-chip-on-bg font-bold text-chip-on-fg' : 'text-ink hover:bg-row-hover'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
        {/* 데스크톱 사이드바 하단 테마 버튼 자리 — 설정 › 앱과 같은 아이콘 세그먼트(☀ | 🌙) */}
        <div className="mx-5 flex items-center justify-between border-t border-rule pt-3.5">
          <span className="text-[15px] font-semibold text-ink-soft">테마</span>
          <ThemeSegment />
        </div>
      </div>
    </Portal>
  );
}

// BottomNav가 "⋯" 탭의 active 상태 계산에 사용.
export function isMoreMenuPath(pathname: string): boolean {
  return MORE_ITEMS.some((item) => isActive(pathname, item.matchPrefixes));
}
