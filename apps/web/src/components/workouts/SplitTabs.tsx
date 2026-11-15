'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { WorkoutSplit } from '@repo/shared';
import { patchWorkoutSession } from '../../lib/api';

interface Props {
  splits: WorkoutSplit[];
  /** 고른 분할 id 또는 'all'(전체) */
  selected: string;
  /** 오늘 할 차례 — 탭 아래 "오늘 차례" */
  nextSplitId: string | null;
  /** 지난번에 한 분할 — 차례 이유(툴팁) */
  lastSplitId: string | null;
  /** 그날 기록이 이미 있으면, 탭을 바꿀 때 그 기록의 분할도 바꿈 */
  activeSessionId: string | null;
}

// 분할 탭(순서대로 + 맨 끝 "전체"). 고른 분할의 종목 카드만 보임.
// 탭을 바꾸면 그날 기록에 "이 분할을 했다"로 남겨 다음 차례 계산에 씀("전체"는 안 바꿈).
// '차례'는 꼬리표가 아니라 탭 이름 아래 글자(primary) — 카드의 "최고" 꼬리표와 헷갈리지 않게.
// 세그먼트 높이를 48px로 고정해 차례 줄이 있는 탭만 두 줄이어도 높이가 같음.
// 선택(chip-on 배경·테두리)과 차례(아래 글자)는 따로 — 다른 분할을 골라도 차례 표시는 남음.
export function SplitTabs({ splits, selected, nextSplitId, lastSplitId, activeSessionId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, startTransition] = useTransition();

  const lastName = splits.find((s) => s.id === lastSplitId)?.name ?? null;
  const nextReason = lastName ? `지난번 ${lastName} 다음 차례예요` : '첫 분할부터 시작해요';

  function choose(id: string) {
    if (id === selected) return;
    const qs = new URLSearchParams(searchParams?.toString() ?? '');
    qs.set('split', id);
    startTransition(async () => {
      if (activeSessionId && id !== 'all') {
        try {
          await patchWorkoutSession(activeSessionId, { splitId: id });
        } catch (err) {
          console.error(err);
        }
      }
      router.push(`/workouts?${qs.toString()}`);
      router.refresh();
    });
  }

  const tabs = [...splits.map((s) => ({ id: s.id, label: s.name })), { id: 'all', label: '전체' }];

  return (
    <div
      role="tablist"
      aria-label="분할"
      className="inline-flex h-12 max-w-full overflow-hidden rounded-md border border-btn-border"
    >
      {tabs.map((t) => {
        const active = t.id === selected;
        const isNext = t.id === nextSplitId;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => choose(t.id)}
            disabled={busy}
            title={isNext ? nextReason : undefined}
            className={`inline-flex h-full min-w-19 cursor-pointer flex-col items-center justify-center px-4 text-[15px] leading-tight not-first:border-l not-first:border-btn-border ${
              active
                ? 'rounded-md bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                : 'bg-btn-bg font-medium text-ink-soft hover:bg-row-hover'
            }`}
          >
            {t.label}
            {isNext ? (
              <span className="text-xs leading-[1.2] font-semibold text-primary">오늘 차례</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
