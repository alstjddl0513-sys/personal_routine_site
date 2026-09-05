'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  type CompanyType1,
} from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';

const OPTIONS = COMPANY_TYPE_1_VALUES.map((v) => ({
  value: v,
  label: COMPANY_TYPE_1_LABELS[v],
}));

export function SizeSelect({
  id,
  value,
}: {
  id: string;
  value: CompanyType1;
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
    setCurrent(next as CompanyType1);
    startTransition(async () => {
      try {
        await patchCompany(id, { type1: next as CompanyType1 });
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
      ariaLabel="규모"
      triggerClassName="cursor-pointer rounded border border-transparent bg-transparent px-2 py-0.5 text-xs text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400 focus:outline-none dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    />
  );
}
