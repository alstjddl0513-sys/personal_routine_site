'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Rss,
  Settings,
  Shield,
  Sun,
} from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type ComponentType, type SVGProps } from 'react';
import { NotifBell } from './NotifBell';
import { RallyLogo } from './RallyLogo';
import { ThemeToggle } from './ThemeToggle';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMyProfile } from '@/lib/api';

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
    href: '/today',
    label: '오늘',
    icon: Sun,
    matchPrefixes: ['/today'],
  },
  {
    href: '/calendar',
    label: '캘린더',
    icon: Calendar,
    matchPrefixes: ['/calendar'],
  },
  {
    href: '/jobs',
    label: '채용',
    icon: Briefcase,
    matchPrefixes: ['/jobs'],
    children: [
      { href: '/jobs', label: '리스트' },
      { href: '/jobs/statistics', label: '통계' },
    ],
  },
  {
    href: '/routines',
    label: '루틴',
    icon: CalendarCheck2,
    matchPrefixes: ['/routines'],
    children: [
      { href: '/routines', label: '트래커' },
      { href: '/routines/statistics', label: '통계' },
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
    href: '/learn',
    label: '학습',
    icon: BookOpen,
    matchPrefixes: ['/learn'],
    children: [
      { href: '/learn', label: '오늘의 학습' },
      { href: '/learn/review', label: '복습' },
      { href: '/learn/statistics', label: '통계' },
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

// 숲색 사이드바(docs/design/rally-dashboard.html) — 전 페이지 공통이라
// 본문이 zinc인 페이지에서도 이 톤.
const SIDE_ICON_BTN =
  'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-side-fg transition-colors hover:bg-side-active hover:text-white';
const SIDE_LINK_ACTIVE = 'bg-side-active font-semibold text-white';
const SIDE_LINK_IDLE = 'text-side-fg hover:bg-side-active/60 hover:text-white';

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

// 어드민일 때만 설정 위에 '관리자 페이지' 줄. 로그인/로그아웃 때마다 다시 확인.
// isAdmin(Phase 12.5)은 /admin 링크 조건부 렌더에만 사용 — 서버 진리치라
// 클라 조작 시도해도 실제 API는 AdminGuard로 재검증.
function AdminLink({ active }: { active: boolean }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const profile = await getMyProfile().catch(() => null);
      if (!cancelled) setIsAdmin(profile?.isAdmin ?? false);
    }

    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-[15px] transition-colors ${
        active ? SIDE_LINK_ACTIVE : SIDE_LINK_IDLE
      }`}
    >
      <Shield className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
      관리자 페이지
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  // Parents whose href doubles as a child link need exact match, otherwise
  // both parent and sub-route link highlight simultaneously.
  if (
    href === '/jobs' ||
    href === '/workouts' ||
    href === '/routines' ||
    href === '/learn'
  ) {
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
    <aside
      data-app-sidebar
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r border-side-border bg-side-bg px-3.5 pt-6 pb-4 font-plex text-side-fg md:flex"
    >
      <Link
        href="/today"
        className="inline-flex items-center gap-2.5 px-2.5 text-xl font-bold tracking-[-0.01em] text-side-strong"
      >
        <RallyLogo size={22} />
        Rally
      </Link>
      <nav
        aria-label="주 메뉴"
        className="-mx-1 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {NAV.map((item) => {
          const { href, label, icon: Icon, children } = item;
          const parentActive = isParentActive(pathname, item);
          const isCollapsed = !!collapsed[href];
          const showChildren = !!children && !isCollapsed;
          return (
            <div key={href} className="flex flex-col gap-0.5">
              <div
                className={`flex items-center rounded-md transition-colors ${
                  parentActive ? SIDE_LINK_ACTIVE : SIDE_LINK_IDLE
                }`}
              >
                <Link
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className="flex min-h-10 flex-1 items-center gap-3 px-3 text-[15px]"
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
                  <span>{label}</span>
                </Link>
                {children ? (
                  <button
                    type="button"
                    onClick={() => toggle(href)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${label} 하위탭 ${isCollapsed ? '펼치기' : '접기'}`}
                    className="mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-side-muted hover:bg-white/10 hover:text-white"
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
                <div className="my-0.5 ml-5.5 flex flex-col gap-px border-l border-side-line pl-2">
                  {children!.map((child) => {
                    const active = isActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-8 items-center rounded-md px-3 text-sm transition-colors ${
                          active ? SIDE_LINK_ACTIVE : SIDE_LINK_IDLE
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

      {/* 왼쪽: 페이지 이동(관리자·설정) — 위 메뉴와 같은 모양 / 오른쪽: 바로 동작하는 버튼 */}
      <div className="flex flex-col gap-px border-t border-side-line pt-3.5">
        <AdminLink active={pathname === '/admin' || pathname.startsWith('/admin/')} />
        <div className="flex items-center gap-0.5">
          <Link
            href="/settings"
            aria-current={isActive(pathname, '/settings') ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-[15px] transition-colors ${
              isActive(pathname, '/settings') ? SIDE_LINK_ACTIVE : SIDE_LINK_IDLE
            }`}
          >
            <Settings className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
            설정
          </Link>
          <span className="flex-1" />
          <ThemeToggle className={SIDE_ICON_BTN} />
          <NotifBell className={SIDE_ICON_BTN} />
        </div>
      </div>
    </aside>
  );
}
