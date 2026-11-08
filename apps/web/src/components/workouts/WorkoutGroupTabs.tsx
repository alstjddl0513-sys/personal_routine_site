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

  // 밑줄 탭 — 카드를 거르는 필터라 카드 바로 위. 0개 탭도 누를 수 있음(→ 빈 상태).
  return (
    <nav className="-mb-px flex self-stretch gap-1" aria-label="운동 부위 필터">
      {GROUP_TABS.map((t) => {
        const isActive = t.key === active;
        const count = counts[t.key];
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex h-13 items-center gap-1.5 border-b-2 px-3 text-[15px] transition-colors ${
              isActive
                ? 'border-primary font-bold text-heading'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            <span>{t.label}</span>
            <span className={`font-normal ${count === 0 ? 'text-icon-faint' : 'text-ink-muted'}`}>
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
