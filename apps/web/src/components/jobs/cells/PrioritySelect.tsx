'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PRIORITY_LABELS, PRIORITY_VALUES, type Priority } from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent:
    'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  important:
    'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  normal:
    'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
};

const OPTIONS = PRIORITY_VALUES.map((v) => ({
  value: v,
  label: PRIORITY_LABELS[v],
  className: PRIORITY_STYLE[v],
}));

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

  function commit(next: string) {
    if (next === current) return;
    const prev = current;
    setCurrent(next as Priority);
    startTransition(async () => {
      try {
        await patchCompany(id, { priority: next as Priority });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
  }

  return (
    <Select
      value={current}
      onChange={commit}
      options={OPTIONS}
      disabled={isPending}
      ariaLabel="우선순위"
      highlightStyle="ring"
      triggerClassName="cursor-pointer rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-zinc-400 focus:outline-none"
    />
  );
}
