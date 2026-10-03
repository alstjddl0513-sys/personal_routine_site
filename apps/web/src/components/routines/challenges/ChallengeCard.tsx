'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Target, Trophy, X } from 'lucide-react';
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
  blocksById: Map<string, TimeBlock>;
  onDeleted: (id: string) => void;
  onPatched: (c: RoutineChallengeWithProgress) => void;
}

export function ChallengeCard({
  challenge,
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
  const isAbandoned = challenge.status === 'abandoned';
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

  return (
    <>
      <article
        className={`flex flex-col gap-2 rounded-md border p-3 ${
          isDone
            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : isAbandoned
              ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50'
              : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
        }`}
      >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          {isDone ? (
            <Trophy
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          ) : isActive ? (
            <Flame
              className="h-4 w-4 shrink-0 text-amber-500"
              aria-hidden
            />
          ) : (
            <Target
              className="h-4 w-4 shrink-0 text-zinc-400"
              aria-hidden
            />
          )}
          <h3 className="min-w-0 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {challenge.title}
          </h3>
        </div>
        <DdayBadge
          status={challenge.status}
          remainingDays={challenge.remainingDays}
        />
      </header>

      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-base">{challenge.successDays}</span>
          <span className="text-zinc-500 dark:text-zinc-400"> / {challenge.targetDays}일</span>
        </span>
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
          {pct}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            isDone ? 'bg-emerald-500' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {blocks.map((b) => (
          <span
            key={b.id}
            className="truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {b.label}
          </span>
        ))}
      </div>

      <footer className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="tabular-nums">시작 {challenge.startDate}</span>
        <div className="flex items-center gap-1">
          {isActive ? (
            <button
              type="button"
              onClick={() => setConfirm('abandon')}
              disabled={isPending}
              className="rounded px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              포기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirm('delete')}
            disabled={isPending}
            aria-label="챌린지 삭제"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </footer>
      </article>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'abandon' ? '챌린지 포기' : '챌린지 삭제'}
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {challenge.title}
            </span>
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

function DdayBadge({
  status,
  remainingDays,
}: {
  status: 'active' | 'completed' | 'abandoned';
  remainingDays: number;
}) {
  if (status === 'completed') {
    return (
      <span className="shrink-0 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        완료
      </span>
    );
  }
  if (status === 'abandoned') {
    return (
      <span className="shrink-0 rounded bg-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
        포기
      </span>
    );
  }
  const label = remainingDays <= 0 ? 'D-day' : `D-${remainingDays}`;
  const color =
    remainingDays <= 7
      ? 'bg-rose-500 text-white'
      : remainingDays <= 30
        ? 'bg-amber-500 text-white'
        : 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900';
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${color}`}
    >
      {label}
    </span>
  );
}
