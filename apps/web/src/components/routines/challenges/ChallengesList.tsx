'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import {
  MAX_ACTIVE_CHALLENGES,
  type RoutineChallengeWithProgress,
  type TimeBlock,
} from '@repo/shared';
import { BUTTON_PRIMARY } from '../../jobs/cells/popover-style';
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

  const openCreate = () => setOpen(true);

  return (
    <section aria-labelledby="challenge-title" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="challenge-title" className="text-[17px] font-bold text-heading">
          챌린지{' '}
          <span className="font-medium text-ink-muted">
            · 진행 중 {activeList.length}/{MAX_ACTIVE_CHALLENGES}
          </span>
        </h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={atLimit}
          title={atLimit ? `진행 중 최대 ${MAX_ACTIVE_CHALLENGES}개까지 가능` : undefined}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border border-btn-border bg-btn-bg px-3.5 text-sm font-medium text-btn-fg hover:border-heading disabled:cursor-not-allowed disabled:border-divider disabled:bg-transparent disabled:text-icon-faint"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          추가
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-btn-border bg-surface px-8 py-9 text-center">
          <p className="text-ink-soft">{'"100일 아침 운동" 같은 목표를 세워보세요.'}</p>
          <button type="button" onClick={openCreate} className={BUTTON_PRIMARY}>
            + 챌린지 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      )}

      {pastList.length > 0 ? (
        <div className="flex max-w-180 flex-col">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 self-start px-1 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                showPast ? '' : '-rotate-90'
              }`}
              strokeWidth={2}
              aria-hidden
            />
            지난 챌린지
            <span className="text-ink-muted">
              ({completedCount > 0 ? `완료 ${completedCount}` : ''}
              {completedCount > 0 && abandonedCount > 0 ? ' · ' : ''}
              {abandonedCount > 0 ? `포기 ${abandonedCount}` : ''})
            </span>
          </button>
          {showPast ? (
            <ul className="border-t border-divider">
              {pastList.map((c) => (
                <ChallengeCard
                  key={c.id}
                  variant="row"
                  challenge={c}
                  blocksById={blocksById}
                  onDeleted={onDeleted}
                  onPatched={onPatched}
                />
              ))}
            </ul>
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
