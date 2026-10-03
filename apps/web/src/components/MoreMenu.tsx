'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss, Settings, X, type LucideIcon } from 'lucide-react';
import { Portal } from './ui/Portal';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
}

const MORE_ITEMS: MoreItem[] = [
  { href: '/blog', label: '블로그', icon: Rss, matchPrefixes: ['/blog'] },
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

// BottomNav의 '⋯ 더보기' 탭에서 열리는 바텀시트. iOS Mail/인스타의 'More' 탭
// 패턴. 메인 5탭에 못 넣은 블로그·설정 접근 경로. 확장 시 여기에만 추가.
export function MoreMenu({ open, onClose }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="더보기 메뉴"
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:hidden dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700"
        />
        <header className="flex items-center justify-between px-4 pb-1 pt-3">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            더보기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <ul className="flex flex-col pb-2">
          {MORE_ITEMS.map((item) => {
            const active = isActive(pathname, item.matchPrefixes);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${
                    active
                      ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Portal>
  );
}

// BottomNav가 "⋯" 탭의 active 상태 계산에 사용.
export function isMoreMenuPath(pathname: string): boolean {
  return MORE_ITEMS.some((item) => isActive(pathname, item.matchPrefixes));
}
