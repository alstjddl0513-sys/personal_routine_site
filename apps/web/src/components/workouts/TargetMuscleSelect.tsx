'use client';

import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';

interface Props {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

// 값 규약: 빈 문자열 = 선택 안 함 (API로 넘길 땐 undefined/null로 변환).
// 옵션 key는 back/chest/... 영문. 라벨은 한글.
export function TargetMuscleSelect({ id, value, onChange, disabled, className }: Props) {
  const upper = MUSCLE_OPTIONS.filter((o) => o.group === 'upper');
  const lower = MUSCLE_OPTIONS.filter((o) => o.group === 'lower');

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        className ??
        'rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950'
      }
    >
      <option value="">(없음)</option>
      <optgroup label="상체">
        {upper.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="하체">
        {lower.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
