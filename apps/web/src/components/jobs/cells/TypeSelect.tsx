'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type CompanyType } from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';

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

  // Existing companies may hold a type2 value whose row has since been
  // deleted from company_types. Surface the raw key with "(삭제됨)" so it
  // stays visible until the user picks a new value.
  const options = useMemo(() => {
    const hasCurrent = types.some((t) => t.key === current);
    const base = types.map((t) => ({ value: t.key, label: t.label }));
    if (hasCurrent) return base;
    return [
      {
        value: current,
        label: `${current} (삭제됨)`,
        className: 'italic text-zinc-500 dark:text-zinc-500',
      },
      ...base,
    ];
  }, [types, current]);

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

  return (
    <Select
      value={current}
      onChange={commit}
      options={options}
      disabled={isPending}
      ariaLabel="유형"
      triggerClassName="cursor-pointer rounded border border-transparent bg-transparent px-2 py-0.5 text-xs text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400 focus:outline-none dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    />
  );
}
