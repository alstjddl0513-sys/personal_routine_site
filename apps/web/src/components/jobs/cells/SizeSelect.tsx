'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  type CompanyType1,
} from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';
import { TABLE_SMALL_TRIGGER } from './table-style';

const OPTIONS = COMPANY_TYPE_1_VALUES.map((v) => ({
  value: v,
  label: COMPANY_TYPE_1_LABELS[v],
}));

// 채용 표(데스크톱) 회사명 아래 "규모" 작은 글자 버튼. 모바일 카드는 바텀시트(mobile/MobileJobCard).
export function SizeSelect({ id, value }: { id: string; value: CompanyType1 }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  function commit(next: string) {
    if (next === current) return;
    startTransition(async () => {
      setCurrent(next as CompanyType1);
      try {
        await patchCompany(id, { type1: next as CompanyType1 });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <Select
      value={current}
      onChange={commit}
      options={OPTIONS}
      disabled={isPending}
      ariaLabel="규모 변경"
      tone="rally"
      triggerClassName={TABLE_SMALL_TRIGGER}
    />
  );
}
