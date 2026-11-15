'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  CalendarCheck2,
  Dumbbell,
  MoreHorizontal,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { isMoreMenuPath, MoreMenu } from './MoreMenu';
import { FOCUS_RING } from './settings/lists/ListCard';

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
}

const TABS: Tab[] = [
  // 캘린더는 '오늘'의 다가오는 일정 카드가 대신해서 더보기로 이동.
  { href: '/today', label: '오늘', icon: Sun, matchPrefixes: ['/today'] },
  { href: '/jobs', label: '채용', icon: Briefcase, matchPrefixes: ['/jobs'] },
  { href: '/routines', label: '루틴', icon: CalendarCheck2, matchPrefixes: ['/routines'] },
  { href: '/workouts', label: '운동', icon: Dumbbell, matchPrefixes: ['/workouts'] },
  { href: '/learn', label: '학습', icon: BookOpen, matchPrefixes: ['/learn'] },
];

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// 칸 공통 — 56px, 아이콘 22px + 글자 10.5px. 활성 = primary 색 + 아이콘 선 2.1 + 700
// (알약 배경 · 위 막대 없음 — 6칸이라 칸이 좁음). docs/design/rally-mobile-shell*.html
function itemClass(active: boolean) {
  return `flex h-14 w-full flex-col items-center justify-center gap-1 text-[10.5px] leading-none ${FOCUS_RING} ${
    active ? 'font-bold text-primary' : 'font-medium text-ink-muted'
  }`;
}

// 모바일 하단 탭 — 5 메인 + '⋯ 더보기'(캘린더/블로그/설정). 흰 바탕 + 위 1px 선(숲색 바는
// 작은 화면에서 어두운 덩어리가 되고 다크에서 탁해서 — 시안 주석). 아래는 홈 표시줄 여백까지 같은 바탕.
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreActive = isMoreMenuPath(pathname);
  // 시트의 effect deps라 렌더마다 새 함수가 되지 않게
  const closeMore = useCallback(() => {
    setMoreOpen(false);
    // 닫으면 연 버튼으로 포커스 복귀(모바일 사파리는 탭해도 버튼에 포커스가 안 가서 직접)
    moreRef.current?.focus();
  }, []);

  return (
    <>
      <nav
        data-app-bottom-nav
        aria-label="주요 탐색"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] font-plex md:hidden"
      >
        <ul className="grid grid-cols-6">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.matchPrefixes);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
                  <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              ref={moreRef}
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-label="더보기 메뉴 열기"
              aria-current={moreActive ? 'page' : undefined}
              className={`${itemClass(moreActive)} cursor-pointer`}
            >
              <MoreHorizontal className="h-5.5 w-5.5" strokeWidth={moreActive ? 2.1 : 1.8} aria-hidden />
              <span>더보기</span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreMenu open={moreOpen} onClose={closeMore} />
    </>
  );
}
