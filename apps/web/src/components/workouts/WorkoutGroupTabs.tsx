import Link from 'next/link';
import { GROUP_TABS, type MuscleGroupFilter } from '../../lib/muscle-groups';

interface Props {
  active: MuscleGroupFilter;
  counts: Record<MuscleGroupFilter, number>;
  /** URL에 함께 유지해야 하는 다른 쿼리 파라미터 (예: date). */
  preserveParams?: Record<string, string | undefined>;
}

export function WorkoutGroupTabs({ active, counts, preserveParams }: Props) {
  function href(key: MuscleGroupFilter): string {
    const qs = new URLSearchParams();
    if (preserveParams) {
      for (const [k, v] of Object.entries(preserveParams)) {
        if (v !== undefined) qs.set(k, v);
      }
    }
    if (key !== 'all') qs.set('group', key);
    const s = qs.toString();
    return s ? `/workouts?${s}` : '/workouts';
  }

  return (
    <nav
      className="flex items-center gap-1"
      aria-label="운동 부위 필터"
    >
      {GROUP_TABS.map((t) => {
        const isActive = t.key === active;
        const count = counts[t.key];
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                isActive
                  ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
