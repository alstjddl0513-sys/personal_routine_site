'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkoutSession } from '@repo/shared';
import { createWorkoutSession, deleteWorkoutSession } from '../../lib/api';
import type { MuscleGroupFilter } from '../../lib/muscle-groups';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  date: string;
  group: MuscleGroupFilter;
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  /** 현재 파트의 세트 수 — 삭제 확인 문구용 */
  activeSetCount: number;
}

function buildUrl(
  date: string,
  group: MuscleGroupFilter,
  sessionId: string | null,
): string {
  const qs = new URLSearchParams();
  qs.set('date', date);
  if (group !== 'all') qs.set('group', group);
  if (sessionId) qs.set('session', sessionId);
  return `/workouts?${qs.toString()}`;
}

// "파트 1을" / "파트 2를" — 숫자 끝소리 받침 따라 조사.
function withObjectParticle(label: string): string {
  const last = label.at(-1) ?? '';
  return `${label}${'013678'.includes(last) ? '을' : '를'}`;
}

// 파트 세그먼트 → 휴지통(현재 파트) → [+ 파트 추가]. 아직 아무것도 안 적은 날도
// "파트 1"을 보여줌 — 실제 파트는 첫 세트·메모를 적을 때 생김.
export function SessionTabs(props: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const real = props.sessions.length > 0;
  const tabs = real ? props.sessions.map((s) => s.id) : [null];
  const activeIdx = real ? Math.max(0, props.sessions.findIndex((s) => s.id === props.activeSessionId)) : 0;
  const activeLabel = `파트 ${activeIdx + 1}`;

  async function onAdd() {
    try {
      // 아직 파트가 없으면 '파트 1'부터 실제로 만들고 그다음 파트를 추가.
      if (!real) await createWorkoutSession({ date: props.date });
      const created = await createWorkoutSession({ date: props.date });
      startTransition(() => {
        router.push(buildUrl(props.date, props.group, created.id));
        router.refresh();
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function onDelete() {
    const id = props.activeSessionId;
    if (!id) return;
    try {
      await deleteWorkoutSession(id);
      const remaining = props.sessions.filter((s) => s.id !== id);
      setConfirmOpen(false);
      startTransition(() => {
        router.push(buildUrl(props.date, props.group, remaining[0]?.id ?? null));
        router.refresh();
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="tablist"
        aria-label="파트"
        className="inline-flex overflow-hidden rounded-md border border-btn-border"
      >
        {tabs.map((id, i) => {
          const active = i === activeIdx;
          return (
            <button
              key={id ?? 'empty'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active || !id) return;
                startTransition(() => router.push(buildUrl(props.date, props.group, id)));
              }}
              disabled={busy}
              className={`min-h-10 cursor-pointer px-4 text-sm text-heading not-first:border-l not-first:border-btn-border ${
                active
                  ? 'rounded-md bg-chip-on-bg font-bold shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                  : 'bg-btn-bg hover:bg-row-hover'
              }`}
            >
              파트 {i + 1}
            </button>
          );
        })}
      </div>
      {props.activeSessionId ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          aria-label={`${activeLabel} 삭제`}
          title={`${activeLabel} 삭제`}
          className="-ml-1.5 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-alert"
        >
          <Trash2 className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 text-sm text-ink-soft hover:text-ink disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
        파트 추가
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title={`${withObjectParticle(activeLabel)} 삭제할까요?`}
        description={
          <p>
            이 파트의 세트 {props.activeSetCount}개와 컨디션 메모도 함께 지워져요. 되돌릴 수
            없어요.
          </p>
        }
        confirmLabel="삭제"
        pending={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
