'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
} from 'lucide-react';
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';

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
  {
    href: '/workouts',
    label: '운동',
    icon: Dumbbell,
    matchPrefixes: ['/workouts'],
    children: [
      { href: '/workouts', label: '기록' },
      { href: '/workouts/statistics', label: '통계' },
    ],
  },
];

const STORAGE_KEY = 'rally.sidebar.collapsed';

function isActive(pathname: string, href: string) {
  // Parents whose own href doubles as a child link (/jobs, /workouts) need
  // exact match so the child stays highlighted when on the sub-route.
  if (href === '/jobs' || href === '/workouts') return pathname === href;
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
  // Only *collapsed* parents are stored; missing entries mean expanded.
  // Initial `{}` on both server and client keeps hydration clean — the
  // effect below rehydrates from localStorage on mount, so a previously
  // collapsed group briefly shows expanded on first paint. Acceptable
  // for a rare one-time action.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setCollapsed(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // localStorage unavailable / bad JSON → stay with defaults.
    }
  }, []);

  function toggle(href: string) {
    setCollapsed((prev) => {
      const next = { ...prev };
      if (next[href]) delete next[href];
      else next[href] = true;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures — state still lives in memory.
      }
      return next;
    });
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-5 pt-5 pb-4">
        <Link href="/jobs" className="text-base font-semibold tracking-tight">
          Rally
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const { href, label, icon: Icon, children } = item;
          const parentActive = isParentActive(pathname, item);
          const isCollapsed = !!collapsed[href];
          const showChildren = !!children && !isCollapsed;
          return (
            <div key={href} className="flex flex-col gap-0.5">
              <div
                className={`flex items-center rounded-md transition-colors ${
                  parentActive
                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Link
                  href={href}
                  className="flex flex-1 items-center gap-3 px-3 py-2 text-sm"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </Link>
                {children ? (
                  <button
                    type="button"
                    onClick={() => toggle(href)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${label} 하위탭 ${isCollapsed ? '펼치기' : '접기'}`}
                    className="mr-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
              {showChildren ? (
                <div className="ml-6 flex flex-col gap-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                  {children!.map((child) => {
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
