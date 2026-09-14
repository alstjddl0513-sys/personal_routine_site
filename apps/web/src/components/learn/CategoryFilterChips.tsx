'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { QuestionCategory } from '@repo/shared';

interface Props {
  categories: QuestionCategory[];
  selected: readonly string[];
}

// 카테고리 chip 다중 선택. URL `?categories=<csv>`로 상태 보존.
// 필터가 바뀌면 daily set이 달라지므로 `?q=`는 함께 제거.
export function CategoryFilterChips({ categories, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const set = new Set(selected);

  function apply(next: Set<string>) {
    const csv = Array.from(next).join(',');
    const params = new URLSearchParams();
    if (csv) params.set('categories', csv);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  }

  function toggle(key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  function clearAll() {
    if (set.size === 0) return;
    apply(new Set());
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipButton
        active={set.size === 0}
        disabled={isPending}
        onClick={clearAll}
        label="전체"
      />
      {categories.map((c) => (
        <ChipButton
          key={c.id}
          active={set.has(c.key)}
          disabled={isPending}
          onClick={() => toggle(c.key)}
          label={c.label}
        />
      ))}
    </div>
  );
}

function ChipButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
      }`}
    >
      {label}
    </button>
  );
}
