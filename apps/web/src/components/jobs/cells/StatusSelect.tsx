'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VALUES,
  type ApplicationStatus,
} from '@repo/shared';
import { patchCompany } from '../../../lib/api';
import { Select } from '../../ui/Select';
import { StatusDot, statusTextClass } from '../StatusDot';
import { HoverChevron, TABLE_TRIGGER } from './table-style';

// 채용 표(데스크톱) 지원상태 칸 — 점 + 글자. 모바일 카드는 바텀시트(mobile/MobileJobCard).
const OPTIONS = APPLICATION_STATUS_VALUES.map((v) => ({
  value: v,
  label: APPLICATION_STATUS_LABELS[v],
  className: statusTextClass(v),
  icon: <StatusDot status={v} />,
}));

export function StatusSelect({ id, value }: { id: string; value: ApplicationStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  function commit(next: string) {
    if (next === current) return;
    startTransition(async () => {
      setCurrent(next as ApplicationStatus);
      try {
        await patchCompany(id, { applicationStatus: next as ApplicationStatus });
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
      ariaLabel="지원상태"
      triggerClassName={`${TABLE_TRIGGER} gap-2 text-sm`}
      triggerSuffix={<HoverChevron />}
    />
  );
}
