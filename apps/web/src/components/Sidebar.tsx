'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, CalendarCheck2, Dumbbell } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children?: NavChild[];
  // pathname prefixes that also activate this nav (for nested routes)
  matchPrefixes?: string[];
}

const NAV: NavItem[] = [
  {
    href: '/jobs',
    label: '채용',
    icon: Briefcase,
    matchPrefixes: ['/jobs'],
    children: [
      { href: '/jobs', label: '기업 분석' },
      { href: '/jobs/statistics', label: '기업 통계' },
    ],
  },
  { href: '/routines', label: '루틴', icon: CalendarCheck2 },
  { href: '/workouts', label: '운동', icon: Dumbbell },
];

function isActive(pathname: string, href: string) {
  if (href === '/jobs') return pathname === '/jobs';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isParentActive(pathname: string, item: NavItem) {
  if (item.matchPrefixes) {
    return item.matchPrefixes.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }
  return isActive(pathname, item.href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-5 pt-5 pb-4">
        <Link href="/jobs" className="text-base font-semibold tracking-tight">
          routine-site
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const { href, label, icon: Icon, children } = item;
          const parentActive = isParentActive(pathname, item);
          return (
            <div key={href} className="flex flex-col gap-0.5">
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  parentActive
                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </Link>
              {children && parentActive ? (
                <div className="ml-6 flex flex-col gap-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                  {children.map((child) => {
                    const active = isActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
