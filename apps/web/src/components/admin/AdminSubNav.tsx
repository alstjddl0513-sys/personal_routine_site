'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FOCUS_RING } from '../settings/lists/ListCard';

const TABS = [
  { href: '/admin/dashboard', label: '개요' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/announcements', label: '공지' },
  { href: '/admin/feedback', label: '피드백' },
];

// 페이지 이동 탭 — 활성은 관리자 청록 2px 밑줄 + 글자(관리자 구역 표시).
export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-1 border-b border-divider">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 items-center rounded-t-md border-b-2 px-3.5 text-[15px] transition-colors ${FOCUS_RING} ${
              active
                ? 'border-admin font-bold text-admin'
                : 'border-transparent font-medium text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
