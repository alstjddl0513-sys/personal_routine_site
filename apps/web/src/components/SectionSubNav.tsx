'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SubTab {
  href: string;
  label: string;
}

const SECTION_TABS: Array<{ prefix: string; tabs: SubTab[] }> = [
  {
    prefix: '/jobs',
    tabs: [
      { href: '/jobs', label: '기업 분석' },
      { href: '/jobs/statistics', label: '기업 통계' },
    ],
  },
  {
    prefix: '/routines',
    tabs: [
      { href: '/routines', label: '트래커' },
      { href: '/routines/calendar', label: '캘린더' },
    ],
  },
  {
    prefix: '/workouts',
    tabs: [
      { href: '/workouts', label: '기록' },
      { href: '/workouts/statistics', label: '통계' },
    ],
  },
];

export function SectionSubNav() {
  const pathname = usePathname();
  const section = SECTION_TABS.find(
    (s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
  );
  if (!section) return null;

  return (
    <nav
      aria-label="하위 탭"
      className="flex gap-1 border-b border-zinc-200 px-3 md:hidden dark:border-zinc-800"
    >
      {section.tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
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
