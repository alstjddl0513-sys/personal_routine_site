'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type {
  RoutineChallengeWithProgress,
  TimeBlock,
} from '@repo/shared';
import { createRoutineChallenge } from '../../../lib/api';
import { Portal } from '../../ui/Portal';

interface Props {
  open: boolean;
  blocks: TimeBlock[];
  onClose: () => void;
  onCreated: (c: RoutineChallengeWithProgress) => void;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CreateChallengeModal({
  open,
  blocks,
  onClose,
  onCreated,
}: Props) {
  if (!open) return null;
  return <ModalBody blocks={blocks} onClose={onClose} onCreated={onCreated} />;
}

function ModalBody({
  blocks,
  onClose,
  onCreated,
}: {
  blocks: TimeBlock[];
  onClose: () => void;
  onCreated: (c: RoutineChallengeWithProgress) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [targetDays, setTargetDays] = useState(100);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function toggleBlock(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (selected.size === 0) {
      setError('블록을 1개 이상 선택하세요.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createRoutineChallenge({
          title: title.trim(),
          startDate,
          targetDays,
          blockIds: Array.from(selected),
        });
        // GET이 아니라 POST 응답엔 progress 없음 — 신규 생성이니 초기값 0으로 머지.
        onCreated({
          ...created,
          successDays: 0,
          remainingDays: created.targetDays,
        });
        router.refresh();
        onClose();
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error && err.message.includes('400')
            ? '진행 중 챌린지가 최대 개수에 도달했어요.'
            : '생성에 실패했어요.',
        );
      }
    });
  }

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-challenge-title"
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-lg pb-[env(safe-area-inset-bottom)] md:max-h-[calc(100vh-2rem)] md:max-w-md md:rounded-lg md:pb-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2
              id="create-challenge-title"
              className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
            >
              챌린지 추가
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <form
            onSubmit={submit}
            className="flex flex-col gap-3 overflow-y-auto p-4"
          >
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                제목
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 100일 아침 운동"
                maxLength={100}
                autoFocus
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  시작일
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  목표 일수
                </span>
                <input
                  type="number"
                  value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  required
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                포함할 블록 (최소 1개)
              </span>
              {blocks.length === 0 ? (
                <p className="rounded border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-500 dark:border-zinc-700">
                  먼저 트래커에서 블록을 추가해주세요.
                </p>
              ) : (
                <div className="flex flex-col gap-1 rounded border border-zinc-200 p-2 dark:border-zinc-800">
                  {blocks.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(b.id)}
                        onChange={() => toggleBlock(b.id)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
                      />
                      <span className="min-w-0 flex-1 truncate">{b.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending || blocks.length === 0}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isPending ? '만드는 중…' : '만들기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
