'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import {
  MAX_ACTIVE_CHALLENGES,
  type RoutineChallengeWithProgress,
  type TimeBlock,
} from '@repo/shared';
import { ChallengeCard } from './ChallengeCard';
import { CreateChallengeModal } from './CreateChallengeModal';

interface Props {
  challenges: RoutineChallengeWithProgress[];
  blocks: TimeBlock[];
}

export function ChallengesList({ challenges, blocks }: Props) {
  const [open, setOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // 로컬 state로 즉시 반영 — router.refresh()는 비동기라 생성/삭제 직후에 count/카드가
  // 아직 old. 서버 fresh 데이터가 prop으로 다시 들어오면 identity 비교로 재동기화.
  const [prevServer, setPrevServer] = useState(challenges);
  const [local, setLocal] = useState(challenges);
  if (prevServer !== challenges) {
    setPrevServer(challenges);
    setLocal(challenges);
  }

  function onCreated(c: RoutineChallengeWithProgress) {
    setLocal((prev) => [c, ...prev]);
  }
  function onDeleted(id: string) {
    setLocal((prev) => prev.filter((x) => x.id !== id));
  }
  function onPatched(c: RoutineChallengeWithProgress) {
    setLocal((prev) => prev.map((x) => (x.id === c.id ? c : x)));
  }

  const blocksById = new Map(blocks.map((b) => [b.id, b]));
  const activeList = local.filter((c) => c.status === 'active');
  // 지난 챌린지: 완료 먼저, 그 다음 포기. 각 그룹 안에선 최근 생성순(createdAt desc).
  const pastList = local
    .filter((c) => c.status !== 'active')
    .sort((a, b) => {
      const order = { completed: 0, abandoned: 1 } as const;
      const diff = order[a.status as 'completed' | 'abandoned'] -
        order[b.status as 'completed' | 'abandoned'];
      if (diff !== 0) return diff;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const completedCount = pastList.filter((c) => c.status === 'completed').length;
  const abandonedCount = pastList.filter((c) => c.status === 'abandoned').length;
  const atLimit = activeList.length >= MAX_ACTIVE_CHALLENGES;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            챌린지
          </h2>
          <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            진행 중 {activeList.length} / {MAX_ACTIVE_CHALLENGES}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={atLimit}
          title={atLimit ? `진행 중 최대 ${MAX_ACTIVE_CHALLENGES}개까지 가능` : undefined}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          추가
        </button>
      </div>

      {activeList.length === 0 && pastList.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
          {'"100일 아침 운동" 같은 목표를 세워보세요.'}
        </div>
      ) : null}

      {activeList.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeList.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              blocksById={blocksById}
              onDeleted={onDeleted}
              onPatched={onPatched}
            />
          ))}
        </div>
      ) : null}

      {pastList.length > 0 ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="inline-flex items-center gap-1 self-start rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                showPast ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
            지난 챌린지
            <span className="tabular-nums text-zinc-400 dark:text-zinc-600">
              ({completedCount > 0 ? `완료 ${completedCount}` : ''}
              {completedCount > 0 && abandonedCount > 0 ? ' · ' : ''}
              {abandonedCount > 0 ? `포기 ${abandonedCount}` : ''})
            </span>
          </button>
          {showPast ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pastList.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  blocksById={blocksById}
                  onDeleted={onDeleted}
                  onPatched={onPatched}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <CreateChallengeModal
        open={open}
        blocks={blocks}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />
    </section>
  );
}
