'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotifBell } from './NotifBell';
import { RallyLogo } from './RallyLogo';
import { FOCUS_RING } from './settings/lists/ListCard';

interface SubTab {
  href: string;
  label: string;
}

const SECTION_TABS: Array<{ prefix: string; tabs: SubTab[] }> = [
  {
    prefix: '/jobs',
    tabs: [
      { href: '/jobs', label: '리스트' },
      { href: '/jobs/statistics', label: '통계' },
    ],
  },
  {
    prefix: '/routines',
    tabs: [
      { href: '/routines', label: '트래커' },
      { href: '/routines/statistics', label: '통계' },
    ],
  },
  {
    prefix: '/workouts',
    tabs: [
      { href: '/workouts', label: '기록' },
      { href: '/workouts/statistics', label: '통계' },
    ],
  },
  {
    prefix: '/learn',
    tabs: [
      { href: '/learn', label: '오늘의 학습' },
      { href: '/learn/review', label: '복습' },
      { href: '/learn/statistics', label: '통계' },
    ],
  },
];

// 로그인/에러 등 인증 밖 화면에선 종도 서브탭도 노출하지 않는다.
const HIDE_PREFIXES = ['/login', '/signup', '/unauthorized'];

export function SectionSubNav() {
  const pathname = usePathname();
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const section = SECTION_TABS.find(
    (s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
  );

  // 모바일 상단 줄(docs/design/rally-mobile-shell*.html) — 52px · paper, 본문과 같이 스크롤됨(고정 X).
  // 로고형(하위 탭 없음)은 아래 선 없음 — 선이 있으면 고정 헤더처럼 보여서. 하위 탭형만 밑줄 자리 divider.
  // 하위 탭은 페이지 이동 링크라 tablist 대신 nav + aria-current.
  return (
    <div
      data-app-subnav
      className={`flex h-13 justify-between gap-2 bg-paper pr-1.5 pl-4 font-plex md:hidden ${
        section ? 'items-end border-b border-divider' : 'items-center'
      }`}
    >
      {section ? (
        <nav aria-label="하위 탭" className="no-scrollbar -ml-2.5 flex min-w-0 flex-1 overflow-x-auto">
          {section.tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px inline-flex h-11 shrink-0 items-center rounded-t-md border-b-2 px-2.5 text-[15px] whitespace-nowrap ${FOCUS_RING} ${
                  active
                    ? 'border-primary font-bold text-primary'
                    : 'border-transparent font-medium text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        // 하위 탭이 없는 화면(오늘 · 캘린더 · 블로그 · 설정)은 🔔만 있는 빈 줄 대신 로고
        <Link
          href="/today"
          aria-label="Rally 오늘 화면"
          className={`inline-flex min-h-11 items-center gap-2 rounded-md ${FOCUS_RING}`}
        >
          <RallyLogo size={20} stemClassName="stroke-ink-strong" />
          <span className="text-lg font-bold tracking-[-0.01em] text-ink-strong">Rally</span>
        </Link>
      )}
      <span className={section ? 'mb-1 flex-none' : 'flex-none'}>
        <NotifBell
          className={`relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink ${FOCUS_RING}`}
          dotClassName="absolute top-2.5 right-2.5 h-1.75 w-1.75 rounded-full bg-primary shadow-[0_0_0_2px_var(--rally-paper)]"
          iconClassName="h-5 w-5"
        />
      </span>
    </div>
  );
}
