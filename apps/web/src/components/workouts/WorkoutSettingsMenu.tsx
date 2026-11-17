'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Columns3,
  Dumbbell,
  Settings,
  Settings2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { useIsMobile } from '../../lib/useIsMobile';
import { BottomSheet } from '../ui/BottomSheet';
import { FOCUS_RING } from '../settings/lists/ListCard';

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/settings/exercises', label: '운동 종목', icon: Dumbbell },
  { href: '/settings/splits', label: '분할', icon: Columns3 },
  { href: '/settings/muscle-goals', label: '주간 운동 목표', icon: Target },
];

// 가끔 쓰는 운동 설정(관리)을 헤더 아이콘 하나로 — 테두리 없이, 날짜 이동과는 구분선으로 나눔.
// 카드 위 줄에는 자주 쓰는 [+ 종목 추가]만.
// 모바일은 36px 테두리 버튼 → 아래 시트 "운동 관리"(더보기 시트와 같은 줄 모양). 작은 팝오버는
// 390px에서 화면 가장자리에 붙고 누를 자리가 좁아서.
export function WorkoutSettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  useOutsideClick(ref, () => setOpen(false), open && !isMobile);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="운동 관리"
        aria-expanded={open}
        aria-haspopup={isMobile ? 'dialog' : 'menu'}
        title="운동 관리"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-btn-border text-heading hover:bg-row-hover md:h-10 md:w-10 md:rounded-md md:border-0 md:text-ink-soft md:hover:text-ink"
      >
        {/* 모바일은 시안대로 톱니, 데스크톱은 지금 아이콘 그대로 */}
        <Settings className="h-4.5 w-4.5 md:hidden" strokeWidth={1.6} aria-hidden />
        <Settings2 className="h-4 w-4 max-md:hidden" aria-hidden />
      </button>
      {isMobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="운동 관리" className="md:hidden">
          <ul className="flex flex-col px-3 pt-1 pb-2 [&>li+li]:border-t [&>li+li]:border-divider">
            {ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-14 items-center gap-3 rounded-md px-3 text-[15px] text-ink ${FOCUS_RING}`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-ink-soft" strokeWidth={1.8} aria-hidden />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </BottomSheet>
      ) : open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-max min-w-40 rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center rounded px-3 text-sm text-ink hover:bg-row-hover"
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
