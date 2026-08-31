'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type CompanyType } from '@repo/shared';
import { patchCompany } from '../../../lib/api';

export function TypeSelect({
  id,
  value,
  types,
}: {
  id: string;
  value: string;
  types: CompanyType[];
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

  // Existing companies may hold a type2 value whose row has since been
  // deleted from company_types. Render the raw key so it's visible until
  // the user picks a new value from the current list.
  const hasCurrent = types.some((t) => t.key === current);

  return (
    <select
      value={current}
      onChange={(e) => commit(e.target.value)}
      disabled={isPending}
      aria-label="유형"
      className="cursor-pointer appearance-none rounded border border-transparent bg-transparent px-2 py-0.5 text-center text-xs text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400 focus:outline-none dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {!hasCurrent ? (
        <option
          value={current}
          className="bg-white text-zinc-500 italic dark:bg-zinc-900 dark:text-zinc-500"
        >
          {current} (삭제됨)
        </option>
      ) : null}
      {types.map((t) => (
        <option
          key={t.key}
          value={t.key}
          className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {t.label}
        </option>
      ))}
    </select>
  );
}
