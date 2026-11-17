'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, ChevronRight, Rss, Settings, Shield, type LucideIcon } from 'lucide-react';
import { BottomSheet } from './ui/BottomSheet';
import { useIsAdmin } from '../lib/useIsAdmin';
import { ThemeSegment } from './settings/ThemeSegment';
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
  /** 관리자에게만 보이는 줄 — 아이콘만 관리자 청록 */
  adminOnly?: boolean;
}

const MORE_ITEMS: MoreItem[] = [
  { href: '/calendar', label: '캘린더', icon: Calendar, matchPrefixes: ['/calendar'] },
  { href: '/blog', label: '블로그', icon: Rss, matchPrefixes: ['/blog'] },
  // 사이드바처럼 설정 위. 모바일엔 사이드바가 없어서 관리자 화면 입구가 여기뿐
  { href: '/admin', label: '관리자 페이지', icon: Shield, matchPrefixes: ['/admin'], adminOnly: true },
  {
    href: '/settings',
    label: '설정',
    icon: Settings,
    matchPrefixes: ['/settings'],
  },
];

function isActive(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// BottomNav의 '⋯ 더보기' 탭에서 열리는 바텀시트(docs/design/rally-mobile-shell*.html).
// 메인 5탭에 못 넣은 캘린더 · 블로그 · 설정 + 테마. 하단 탭은 시트 뒤에 그대로(scrim이 덮음).
// 시트 동작(닫기 · 끌기 · focus trap · 스크롤 잠금)은 공용 BottomSheet.
export function MoreMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const items = MORE_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  return (
    <BottomSheet open={open} onClose={onClose} title="더보기" className="md:hidden">
      {/* 항목 사이 divider — 활성(chip-on 배경) 줄 앞뒤는 배경이 구분해서 선 없음 */}
      <ul className="flex flex-col gap-px px-3 pt-1 pb-2 [&>li+li]:border-t [&>li+li]:border-divider [&>li:has([aria-current])]:border-transparent [&>li:has([aria-current])+li]:border-transparent">
        {items.map((item) => {
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
                <Icon
                  className={`h-5 w-5 shrink-0 ${item.adminOnly ? 'text-admin' : ''}`}
                  strokeWidth={active ? 2.1 : 1.8}
                  aria-hidden
                />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      {/* 데스크톱 사이드바 하단 테마 버튼 자리 — 설정 › 앱과 같은 아이콘 세그먼트(☀ | 🌙) */}
      <div className="mx-5 mb-1 flex items-center justify-between border-t border-rule pt-3.5">
        <span className="text-[15px] font-semibold text-ink-soft">테마</span>
        <ThemeSegment />
      </div>
    </BottomSheet>
  );
}

// BottomNav가 "⋯" 탭의 active 상태 계산에 사용.
export function isMoreMenuPath(pathname: string): boolean {
  return MORE_ITEMS.some((item) => isActive(pathname, item.matchPrefixes));
}
