'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface UnrecordedItem {
  id: string;
  name: string;
  muscle: string;
  /** 무게 없이라도 기록한 마지막 날(ISO) — 맨몸 운동. 없으면 null */
  lastDate: string | null;
}

const monthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

// 무게 기록이 없는 종목(아직 안 한 종목·맨몸 운동) — 그래프를 못 그려서 카드 대신 맨 아래 접기.
export function UnrecordedExercises({ items }: { items: UnrecordedItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-divider pt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="unrecorded-list"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        무게 기록이 없는 종목 {items.length}개
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
      </button>
      {open ? (
        <ul id="unrecorded-list" className="max-w-140">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex min-h-10 items-center gap-3 border-b border-divider text-sm last:border-b-0"
            >
              <span className="min-w-0 truncate font-semibold">{it.name}</span>
              <span className="text-ink-muted">{it.muscle}</span>
              {/* 기록 있는 종목만 날짜 — 없는 종목마다 "아직 기록이 없어요"를 되풀이하지 않음 */}
              {it.lastDate ? (
                <span className="ml-auto shrink-0 text-ink-muted">최근 기록 {monthDay(it.lastDate)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
