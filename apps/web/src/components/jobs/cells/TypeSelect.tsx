'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  COMPANY_TYPE_2_LABELS,
  COMPANY_TYPE_2_VALUES,
  type CompanyType2,
} from '@repo/shared';
import { patchCompany } from '../../../lib/api';

export function TypeSelect({
  id,
  value,
}: {
  id: string;
  value: CompanyType2;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  function commit(next: CompanyType2) {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await patchCompany(id, { type2: next });
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
      onChange={(e) => commit(e.target.value as CompanyType2)}
      disabled={isPending}
      aria-label="유형"
      className="cursor-pointer appearance-none rounded border border-transparent bg-transparent px-2 py-0.5 text-center text-xs text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400 focus:outline-none dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {COMPANY_TYPE_2_VALUES.map((v) => (
        <option key={v} value={v} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {COMPANY_TYPE_2_LABELS[v]}
        </option>
      ))}
    </select>
  );
}
