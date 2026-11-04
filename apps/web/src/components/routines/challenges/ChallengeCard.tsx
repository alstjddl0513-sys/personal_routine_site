'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Trash2, X } from 'lucide-react';
import type {
  RoutineChallengeWithProgress,
  TimeBlock,
} from '@repo/shared';
import {
  deleteRoutineChallenge,
  patchRoutineChallenge,
} from '../../../lib/api';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

interface Props {
  challenge: RoutineChallengeWithProgress;
  /** card = 진행 중 카드 / row = 지난 챌린지 목록 한 줄 */
  variant?: 'card' | 'row';
  blocksById: Map<string, TimeBlock>;
  onDeleted: (id: string) => void;
  onPatched: (c: RoutineChallengeWithProgress) => void;
}

export function ChallengeCard({
  challenge,
  variant = 'card',
  blocksById,
  onDeleted,
  onPatched,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<'delete' | 'abandon' | null>(null);

  const pct =
    challenge.targetDays > 0
      ? Math.min(
          100,
          Math.round((challenge.successDays / challenge.targetDays) * 100),
        )
      : 0;

  const isDone = challenge.status === 'completed';
  const isActive = challenge.status === 'active';

  const blocks = challenge.blockIds
    .map((id) => blocksById.get(id))
    .filter((b): b is TimeBlock => !!b);

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteRoutineChallenge(challenge.id);
        onDeleted(challenge.id);
        router.refresh();
      } catch (err) {
        console.error(err);
      } finally {
        setConfirm(null);
      }
    });
  }

  function onAbandon() {
    startTransition(async () => {
      try {
        const updated = await patchRoutineChallenge(challenge.id, {
          status: 'abandoned',
        });
        onPatched({
          ...challenge,
          ...updated,
          // patch response엔 progress 필드 없음 — 기존 값 유지, status/abandonedAt만 반영.
          successDays: challenge.successDays,
          remainingDays: challenge.remainingDays,
        });
        router.refresh();
      } catch (err) {
        console.error(err);
      } finally {
        setConfirm(null);
      }
    });
  }

  const deleteButton = (
    <button
      type="button"
      onClick={() => setConfirm('delete')}
      disabled={isPending}
      aria-label={`${challenge.title} 삭제`}
      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-alert disabled:opacity-50"
    >
      <Trash2 className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
    </button>
  );

  return (
    <>
      {variant === 'row' ? (
        // 상태 · 제목 · 기록 · 삭제 고정 열 — 기록이 제목 바로 옆에서 읽히게.
        <li className="grid min-h-12 grid-cols-[52px_minmax(0,1fr)_auto_40px] items-center gap-x-3.5 border-b border-divider px-1">
          <span
            className={`inline-flex items-center gap-1.25 text-[13px] font-semibold ${
              isDone ? 'text-heading' : 'text-ink-muted'
            }`}
          >
            {isDone ? (
              <Check className="h-3.25 w-3.25" strokeWidth={2.4} aria-hidden />
            ) : (
              <X className="h-3.25 w-3.25" strokeWidth={2.4} aria-hidden />
            )}
            {isDone ? '완료' : '포기'}
          </span>
          <span className={`min-w-0 flex-1 truncate text-sm ${isDone ? 'text-ink' : 'text-ink-muted'}`}>
            {challenge.title}
          </span>
          <span className="text-[13px] text-ink-muted">{pastRecord(challenge)}</span>
          {deleteButton}
        </li>
      ) : (
        <article className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-5 pt-4.5 pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="min-w-0 truncate text-base font-bold">{challenge.title}</h3>
            <span className="shrink-0 text-[13px] font-semibold text-ink-soft">
              {challenge.remainingDays <= 0 ? 'D-day' : `D-${challenge.remainingDays}`}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] leading-tight font-semibold">{challenge.successDays}</span>
            <span className="text-sm text-ink-muted">
              / {challenge.targetDays}일 · {pct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-marigold" style={{ width: `${pct}%` }} />
          </div>
          {blocks.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {blocks.map((b) => (
                <span
                  key={b.id}
                  className="max-w-full truncate rounded px-2 py-px text-xs text-ink-soft bg-tag-bg"
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-divider pt-1.5">
            <span className="text-xs text-ink-muted">시작 {challenge.startDate}</span>
            <span className="flex items-center">
              {isActive ? (
                <button
                  type="button"
                  onClick={() => setConfirm('abandon')}
                  disabled={isPending}
                  className="min-h-10 cursor-pointer rounded-md px-2.5 text-[13px] text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  포기
                </button>
              ) : null}
              {deleteButton}
            </span>
          </div>
        </article>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'abandon' ? '챌린지 포기' : '챌린지 삭제'}
        description={
          <p>
            <span className="font-medium text-ink">{challenge.title}</span>
            {confirm === 'abandon'
              ? ' 챌린지를 포기할까요? 기록은 남아요.'
              : ' 챌린지를 삭제할까요? 되돌릴 수 없어요.'}
          </p>
        }
        confirmLabel={
          isPending
            ? '처리 중…'
            : confirm === 'abandon'
              ? '포기'
              : '삭제'
        }
        pending={isPending}
        onConfirm={confirm === 'abandon' ? onAbandon : onDelete}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

// 지난 챌린지 기록: "21 / 21일 · 10.10 달성" / "12 / 50일에서 멈춤 · 09.30".
// 성공 일수는 서버가 끝난 날까지만 셈.
function pastRecord(c: RoutineChallengeWithProgress): string {
  const days = `${c.successDays} / ${c.targetDays}일`;
  if (c.status === 'completed') {
    return c.completedAt ? `${days} · ${seoulMonthDay(c.completedAt)} 달성` : `${days} 달성`;
  }
  return c.abandonedAt ? `${days}에서 멈춤 · ${seoulMonthDay(c.abandonedAt)}` : `${days}에서 멈춤`;
}

function seoulMonthDay(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}.${get('day')}`;
}
