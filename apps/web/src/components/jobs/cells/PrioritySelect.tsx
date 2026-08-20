'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PRIORITY_LABELS, PRIORITY_VALUES, type Priority } from '@repo/shared';
import { patchCompany } from '../../../lib/api';

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  important:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  normal:
    'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
};

export function PrioritySelect({
  id,
  value,
}: {
  id: string;
  value: Priority;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  function commit(next: Priority) {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await patchCompany(id, { priority: next });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
  }

  return (
    <select
      value={current}
      onChange={(e) => commit(e.target.value as Priority)}
      disabled={isPending}
      aria-label="우선순위"
      className={`cursor-pointer appearance-none rounded border px-2 py-0.5 text-center text-xs outline-none focus:ring-2 focus:ring-zinc-400 ${PRIORITY_STYLE[current]}`}
    >
      {PRIORITY_VALUES.map((v) => (
        <option key={v} value={v} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {PRIORITY_LABELS[v]}
        </option>
      ))}
    </select>
  );
}
