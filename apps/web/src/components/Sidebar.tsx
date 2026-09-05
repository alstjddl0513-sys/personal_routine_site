'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  LogOut,
  Rss,
  Settings,
} from 'lucide-react';
import { useSyncExternalStore, type ComponentType, type SVGProps } from 'react';
import { ThemeToggle } from './ThemeToggle';

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
  {
    href: '/routines',
    label: '루틴',
    icon: CalendarCheck2,
    matchPrefixes: ['/routines'],
    children: [
      { href: '/routines', label: '트래커' },
      { href: '/routines/calendar', label: '캘린더' },
    ],
  },
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
  {
    href: '/blog',
    label: '블로그',
    icon: Rss,
    matchPrefixes: ['/blog'],
  },
];

const STORAGE_KEY = 'rally.sidebar.collapsed';

// localStorage-backed store for `useSyncExternalStore`. Avoids the
// setState-in-effect anti-pattern (React 19 warns).
type CollapsedMap = Record<string, boolean>;
const EMPTY_COLLAPSED: CollapsedMap = {};
const collapsedListeners = new Set<() => void>();
// getSnapshot must return a stable reference — cache by raw string so
// unchanged localStorage returns the same object across renders.
let cachedRaw: string | null | undefined;
let cachedSnapshot: CollapsedMap = EMPTY_COLLAPSED;

function readCollapsedClient(): CollapsedMap {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_COLLAPSED;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = EMPTY_COLLAPSED;
    return cachedSnapshot;
  }
  try {
    cachedSnapshot = JSON.parse(raw) as CollapsedMap;
  } catch {
    cachedSnapshot = EMPTY_COLLAPSED;
  }
  return cachedSnapshot;
}

function readCollapsedServer(): CollapsedMap {
  return EMPTY_COLLAPSED;
}

function subscribeCollapsed(callback: () => void) {
  collapsedListeners.add(callback);
  return () => {
    collapsedListeners.delete(callback);
  };
}

function writeCollapsed(next: CollapsedMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  cachedRaw = undefined;
  cachedSnapshot = next;
  collapsedListeners.forEach((fn) => fn());
}

function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' }).catch(() => {});
    router.replace('/login');
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="로그아웃"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function isActive(pathname: string, href: string) {
  // Parents whose href doubles as a child link need exact match, otherwise
  // both parent and sub-route link highlight simultaneously.
  if (href === '/jobs' || href === '/workouts' || href === '/routines') {
    return pathname === href;
  }
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
  // Missing entries = expanded (default). Previously-collapsed groups
  // briefly flash expanded on first paint before hydration swaps in the
  // localStorage snapshot — acceptable for a rare one-time action.
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsedClient,
    readCollapsedServer,
  );

  function toggle(href: string) {
    const current = readCollapsedClient();
    const next = { ...current };
    if (next[href]) delete next[href];
    else next[href] = true;
    writeCollapsed(next);
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 md:flex dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-5 pt-5 pb-4">
        <Link href="/jobs" className="text-base font-semibold tracking-tight">
          Rally
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
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

      <div className="mt-2 flex items-center justify-between border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <Link
          href="/settings"
          className={`inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
            isActive(pathname, '/settings')
              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Settings className="h-3.5 w-3.5" aria-hidden />
          <span>설정</span>
        </Link>
        <div className="flex items-center gap-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
