'use client';

import { useMemo, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type CompanyType } from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';
import { TABLE_SMALL_TRIGGER } from './table-style';

// 채용 표(데스크톱) 회사명 아래 "유형" 작은 글자 버튼. 모바일 카드는 바텀시트(mobile/MobileJobCard).
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
  const [current, setCurrent] = useOptimistic(value);

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
        className: 'italic text-ink-muted',
      },
      ...base,
    ];
  }, [types, current]);

  function commit(next: string) {
    if (next === current) return;
    startTransition(async () => {
      setCurrent(next);
      try {
        await patchCompany(id, { type2: next });
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
      options={options}
      disabled={isPending}
      ariaLabel="유형 변경"
      triggerClassName={TABLE_SMALL_TRIGGER}
    />
  );
}
