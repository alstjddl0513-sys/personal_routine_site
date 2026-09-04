'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CalendarCheck2,
  Dumbbell,
  Rss,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
}

const TABS: Tab[] = [
  { href: '/jobs', label: '채용', icon: Briefcase, matchPrefixes: ['/jobs'] },
  { href: '/routines', label: '루틴', icon: CalendarCheck2, matchPrefixes: ['/routines'] },
  { href: '/workouts', label: '운동', icon: Dumbbell, matchPrefixes: ['/workouts'] },
  { href: '/blog', label: '블로그', icon: Rss, matchPrefixes: ['/blog'] },
  { href: '/settings', label: '설정', icon: Settings, matchPrefixes: ['/settings'] },
];

function isActive(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 탐색"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.matchPrefixes);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] leading-tight transition-colors ${
                  active
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? '' : 'opacity-80'}`}
                  aria-hidden
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
