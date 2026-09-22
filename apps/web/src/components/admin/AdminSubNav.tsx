'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/dashboard', label: '개요' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/announcements', label: '공지' },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="관리자 서브 탭"
      className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`border-b-2 px-4 py-2 text-sm transition-colors ${
              active
                ? 'border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
