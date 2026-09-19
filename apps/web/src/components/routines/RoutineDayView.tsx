'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import type { RoutineCheck, TimeBlock } from '@repo/shared';
import { toggleRoutineCheck } from '../../lib/api';
import { formatTimeRange } from '../../lib/routines-time';
import { dowLabel, toISODate } from '../../lib/routines-week';
import { AddTimeBlockRow } from './AddTimeBlockRow';
import { checkKey } from './RoutineTable';

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
}

function pickInitialDate(days: Date[]): string {
  const todayIso = toISODate(new Date());
  return days.some((d) => toISODate(d) === todayIso)
    ? todayIso
    : toISODate(days[0]);
}

export function RoutineDayView({ blocks, checks, days }: Props) {
  const router = useRouter();
  // 서버 확정 + 낙관 overlay (RoutineTable과 동일 패턴).
  const serverCheckedSet = useMemo(
    () => new Set(checks.map((c) => checkKey(c.blockId, c.date))),
    [checks],
  );
  const [overlayFor, setOverlayFor] = useState(checks);
  const [overlay, setOverlay] = useState<Map<string, boolean>>(() => new Map());
  if (overlayFor !== checks) {
    setOverlayFor(checks);
    setOverlay(new Map());
  }
  const isChecked = (key: string) => overlay.get(key) ?? serverCheckedSet.has(key);

  const weekKey = toISODate(days[0]);
  const [selectedDate, setSelectedDate] = useState(() => pickInitialDate(days));
  // 주 이동 시 선택 날짜 초기화 (identity compare).
  const [weekKeyFor, setWeekKeyFor] = useState(weekKey);
  if (weekKeyFor !== weekKey) {
    setWeekKeyFor(weekKey);
    setSelectedDate(pickInitialDate(days));
  }

  async function onToggle(blockId: string, date: string) {
    const key = checkKey(blockId, date);
    const prev = isChecked(key);
    setOverlay((m) => new Map(m).set(key, !prev));
    try {
      await toggleRoutineCheck({ blockId, date, checked: !prev });
      // 형제로 렌더되는 RoutineTable(데스크톱)과 상태 sync — refresh하면 checks
      // prop이 새 array로 도착 → identity 변경 → 양쪽 overlay 자동 clear.
      router.refresh();
    } catch (err) {
      console.error(err);
      setOverlay((m) => {
        const c = new Map(m);
        c.delete(key);
        return c;
      });
    }
  }

  const todayIso = toISODate(new Date());
  const selectedDateObj = days.find((d) => toISODate(d) === selectedDate);
  const selectedLabel = selectedDateObj
    ? `${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()} (${dowLabel(selectedDateObj)})`
    : selectedDate;
  const doneCount = blocks.reduce(
    (n, b) => n + (isChecked(checkKey(b.id, selectedDate)) ? 1 : 0),
    0,
  );
  const nextSortOrder =
    (blocks.length ? Math.max(...blocks.map((b) => b.sortOrder)) : -1) + 1;

  return (
    <div className="flex flex-col gap-3 md:hidden">
      <nav className="grid grid-cols-7 gap-1" aria-label="요일 선택">
        {days.map((d) => {
          const iso = toISODate(d);
          const selected = iso === selectedDate;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              aria-pressed={selected}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border text-xs transition-colors ${
                selected
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : isToday
                    ? 'border-zinc-400 bg-white text-zinc-700 dark:border-zinc-500 dark:bg-zinc-950 dark:text-zinc-300'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
              }`}
            >
              <span className="text-[10px] leading-none">{dowLabel(d)}</span>
              <span className="text-sm leading-none tabular-nums">
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {selectedLabel}
        </h2>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {doneCount}/{blocks.length} 완료
        </span>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
          아직 만든 시간블록이 없어요.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {blocks.map((block) => {
            const key = checkKey(block.id, selectedDate);
            const checked = isChecked(key);
            const timeText =
              block.startTime !== null
                ? formatTimeRange(block.startTime, block.endTime)
                : null;
            return (
              <li key={block.id}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">
                  {timeText ? (
                    <span className="w-20 shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {timeText}
                    </span>
                  ) : null}
                  <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                    {block.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(block.id, selectedDate)}
                    aria-label={`${block.label} ${selectedDate}`}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 px-1">
        <AddTimeBlockRow nextSortOrder={nextSortOrder} />
        <Link
          href="/settings/time-blocks"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          블록 관리
        </Link>
      </div>
    </div>
  );
}
