'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PRIORITY_LABELS, PRIORITY_VALUES, type Priority } from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';
import { HoverChevron, TABLE_TRIGGER } from './table-style';

// 긴급만 마감색으로 튀게. 상 · 하가 비슷한 회색이라 구분이 안 됐음 → 상은 진하게(본문 색 · 600),
// 하는 흐리게(ink-faint). 표와 모바일 카드가 같이 씀.
export const PRIORITY_TONE: Record<Priority, string> = {
  urgent: 'font-semibold text-alert',
  important: 'font-semibold text-ink',
  normal: 'text-ink-faint',
};
const OPTIONS = PRIORITY_VALUES.map((v) => ({
  value: v,
  label: PRIORITY_LABELS[v],
  className: PRIORITY_TONE[v],
}));

// 채용 표(데스크톱) 우선순위 칸. 모바일 카드는 바텀시트(mobile/MobileJobCard).
export function PrioritySelect({ id, value }: { id: string; value: Priority }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  function commit(next: string) {
    if (next === current) return;
    startTransition(async () => {
      setCurrent(next as Priority);
      try {
        await patchCompany(id, { priority: next as Priority });
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
      ariaLabel="우선순위"
      tone="rally"
      triggerClassName={`${TABLE_TRIGGER} text-sm`}
      triggerSuffix={<HoverChevron />}
    />
  );
}
