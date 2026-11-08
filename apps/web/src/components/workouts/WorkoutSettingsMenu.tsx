'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { useOutsideClick } from '../../lib/useOutsideClick';

const ITEMS = [
  { href: '/settings/exercises', label: '종목 관리' },
  { href: '/settings/splits', label: '분할 관리' },
  { href: '/settings/muscle-goals', label: '부위별 주간 목표' },
];

// 가끔 쓰는 운동 설정(관리)을 헤더 아이콘 하나로 — 테두리 없이, 날짜 이동과는 구분선으로 나눔.
// 카드 위 줄에는 자주 쓰는 [+ 종목 추가]만.
export function WorkoutSettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="관리"
        aria-expanded={open}
        aria-haspopup="menu"
        title="관리"
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-row-hover hover:text-ink md:h-10 md:w-10"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-max min-w-40 rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center rounded px-3 text-sm text-ink hover:bg-row-hover"
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
