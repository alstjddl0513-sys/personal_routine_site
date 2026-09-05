'use client';

import { useMemo } from 'react';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';
import { Select, type SelectGroup } from '../ui/Select';

interface Props {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

// 값 규약: 빈 문자열 = 선택 안 함 (API로 넘길 땐 undefined/null로 변환).
export function TargetMuscleSelect({
  id,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const groups = useMemo<SelectGroup[]>(() => {
    const upper = MUSCLE_OPTIONS.filter((o) => o.group === 'upper').map((o) => ({
      value: o.key,
      label: o.label,
    }));
    const lower = MUSCLE_OPTIONS.filter((o) => o.group === 'lower').map((o) => ({
      value: o.key,
      label: o.label,
    }));
    return [
      { label: '(선택 안 함)', options: [{ value: '', label: '(없음)' }] },
      { label: '상체', options: upper },
      { label: '하체', options: lower },
    ];
  }, []);

  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      options={groups}
      disabled={disabled}
      ariaLabel="타겟 부위"
      placeholder="(없음)"
      triggerClassName={
        className ??
        'min-h-11 w-full justify-between rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950'
      }
    />
  );
}
