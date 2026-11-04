'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import type {
  RoutineChallengeWithProgress,
  TimeBlock,
} from '@repo/shared';
import { createRoutineChallenge } from '../../../lib/api';
import { Portal } from '../../ui/Portal';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  POPOVER_CLOSE,
} from '../../jobs/cells/popover-style';

const FIELD_LABEL = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-soft';
const FIELD_INPUT =
  'min-h-11 rounded-md border border-btn-border bg-surface px-3 text-[15px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-primary';

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
  // 블록을 한 번이라도 건드린 뒤 0개가 되면 경고 — 처음 열자마자 빨간 글자 X.
  const [touchedBlocks, setTouchedBlocks] = useState(false);

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
    setTouchedBlocks(true);
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
          className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface font-plex text-ink shadow-lg pb-[env(safe-area-inset-bottom)] md:max-h-[calc(100vh-2rem)] md:max-w-120 md:rounded-lg md:pb-0"
        >
          <form
            onSubmit={submit}
            className="flex flex-col gap-4.5 overflow-y-auto px-7 pt-6 pb-6"
          >
            <header className="-mr-2.5 flex items-center justify-between gap-2">
              <h2 id="create-challenge-title" className="text-xl font-bold">
                새 챌린지
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className={POPOVER_CLOSE.replace('-mr-2 ', '')}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <label className={FIELD_LABEL}>
              제목
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 100일 아침 운동"
                maxLength={100}
                autoFocus
                className={FIELD_INPUT}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={FIELD_LABEL}>
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={FIELD_INPUT}
                />
              </label>
              <label className={FIELD_LABEL}>
                목표 일수
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    required
                    className={`${FIELD_INPUT} w-full min-w-0`}
                  />
                  <span className="font-normal">일</span>
                </span>
              </label>
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-semibold text-ink-soft">
                포함할 블록 <span className="font-normal text-ink-muted">· 1개 이상</span>
              </legend>
              {blocks.length === 0 ? (
                <p className="text-sm text-ink-muted">먼저 트래커에서 블록을 추가해보세요.</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-3">
                  {blocks.map((b) => {
                    const on = selected.has(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleBlock(b.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
                            on ? 'bg-primary' : 'border-[1.5px] border-check-off'
                          }`}
                        >
                          {on ? (
                            <Check className="h-3.25 w-3.25 text-white dark:text-paper" strokeWidth={3.2} />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{b.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {touchedBlocks && selected.size === 0 ? (
                <p className="text-[13px] text-alert">블록을 하나 이상 선택해주세요.</p>
              ) : null}
            </fieldset>

            <p className="text-[13px] text-ink-muted">선택한 블록을 모두 체크한 날이 1일로 쌓여요.</p>

            {error ? <p className="text-[13px] text-alert">{error}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className={`${BUTTON_SECONDARY} min-h-11 px-4.5`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending || selected.size === 0}
                className={`${BUTTON_PRIMARY} min-h-11 disabled:cursor-not-allowed`}
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
