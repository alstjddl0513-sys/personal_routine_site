'use client';

import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';
import { Select, type SelectOption } from '../ui/Select';

interface Props {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** 트리거 모양 — 종목 추가 창 · 설정 종목 편집이 각자 입력칸 모양으로 */
  className: string;
}

// 가슴 · 등 · 어깨 · 팔 · 하체 · 기타. '기타' = 부위 없음(빈 값) → 부위 탭 '기타'.
// 모바일 종목 추가 시트의 부위 칩도 같은 목록.
export const TARGET_MUSCLE_CHOICES: SelectOption[] = (() => {
  const order = ['chest', 'back', 'shoulder', 'arm', 'leg'];
  const byKey = new Map(MUSCLE_OPTIONS.map((o) => [o.key, o.label]));
  return [
    ...order.filter((k) => byKey.has(k)).map((k) => ({ value: k, label: byKey.get(k)! })),
    { value: '', label: '기타' },
  ];
})();

// 값 규약: 빈 문자열 = 선택 안 함 (API로 넘길 땐 undefined/null로 변환).
export function TargetMuscleSelect({
  id,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      options={TARGET_MUSCLE_CHOICES}
      disabled={disabled}
      ariaLabel="타겟 부위"
      placeholder="기타"
      triggerClassName={className}
    />
  );
}
