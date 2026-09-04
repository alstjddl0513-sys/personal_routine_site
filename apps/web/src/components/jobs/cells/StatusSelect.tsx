'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VALUES,
  type ApplicationStatus,
} from '@repo/shared';
import { patchCompany } from '../../../lib/api';

export const STATUS_STYLE: Record<ApplicationStatus, string> = {
  not_applied:
    'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  applied:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  document_passed:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  document_failed:
    'bg-zinc-50 text-zinc-400 line-through border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800',
  interview_1_passed:
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
  interview_1_failed:
    'bg-zinc-50 text-zinc-400 line-through border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800',
  interview_2_passed:
    'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
  interview_2_failed:
    'bg-zinc-50 text-zinc-400 line-through border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800',
  final_passed:
    'bg-amber-100 text-amber-800 border-amber-300 font-semibold dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  final_failed:
    'bg-zinc-50 text-zinc-400 line-through border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800',
  withdrawn:
    'bg-zinc-100 text-zinc-500 italic border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
};

export function StatusSelect({
  id,
  value,
}: {
  id: string;
  value: ApplicationStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  function commit(next: ApplicationStatus) {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await patchCompany(id, { applicationStatus: next });
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
      onChange={(e) => commit(e.target.value as ApplicationStatus)}
      disabled={isPending}
      aria-label="지원상태"
      className={`cursor-pointer appearance-none rounded border px-2 py-0.5 text-center text-xs outline-none focus:ring-2 focus:ring-zinc-400 ${STATUS_STYLE[current]}`}
    >
      {APPLICATION_STATUS_VALUES.map((v) => (
        <option key={v} value={v} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {APPLICATION_STATUS_LABELS[v]}
        </option>
      ))}
    </select>
  );
}
