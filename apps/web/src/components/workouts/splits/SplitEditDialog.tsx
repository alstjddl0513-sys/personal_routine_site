'use client';

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';
import { WORKOUT_SPLIT_NAME_MAX, type Exercise, type WorkoutSplit } from '@repo/shared';
import { createWorkoutSplit, patchWorkoutSplit } from '../../../lib/api';
import { classifyMuscleGroup } from '../../../lib/muscle-groups';
import { Portal } from '../../ui/Portal';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  POPOVER_CLOSE,
} from '../../jobs/cells/popover-style';

export const FIELD_LABEL = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-soft';
const FIELD_INPUT =
  'min-h-11 w-full rounded-md border border-btn-border bg-surface px-3 text-[15px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-primary';
const GROUP_LABEL = { upper: '상체', lower: '하체', other: '기타' } as const;

// 분할 창 공통 틀 — 루틴 챌린지 모달과 같은 모양(제목 줄 ✕, 모바일은 아래에서 올라옴).
export function SplitDialogShell({
  title,
  labelId,
  onClose,
  busy,
  children,
}: {
  title: string;
  labelId: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <Portal>
      <div aria-hidden className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <div className="flex max-h-[85vh] w-full flex-col gap-4.5 overflow-y-auto rounded-t-2xl bg-surface px-7 pt-6 pb-6 font-plex text-ink shadow-lg md:max-h-[calc(100vh-2rem)] md:max-w-120 md:rounded-lg">
          <header className="-mr-2.5 flex items-center justify-between gap-2">
            <h2 id={labelId} className="text-xl font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="닫기"
              className={POPOVER_CLOSE.replace('-mr-2 ', '')}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
          {children}
        </div>
      </div>
    </Portal>
  );
}

// 이름 + 부위별 종목 체크. 종목은 비워둬도 됨(나중에 고름).
export function SplitEditDialog({
  split,
  exercises,
  onClose,
  onSaved,
  onBack,
}: {
  /** null이면 새 분할 */
  split: WorkoutSplit | null;
  /** 보관 안 한 종목 */
  exercises: Exercise[];
  onClose: () => void;
  onSaved: (s: WorkoutSplit) => void;
  /** 분할 만들기 창에서 열었을 때만 — "‹ 예시 보기"로 돌아감 */
  onBack?: () => void;
}) {
  const [name, setName] = useState(split?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(split?.exerciseIds ?? []));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = (['upper', 'lower', 'other'] as const)
    .map((g) => ({ key: g, items: exercises.filter((e) => classifyMuscleGroup(e.targetMuscle) === g) }))
    .filter((g) => g.items.length > 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력하세요.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const input = { name: trimmed, exerciseIds: [...selected] };
        onSaved(split ? await patchWorkoutSplit(split.id, input) : await createWorkoutSplit(input));
      } catch (err) {
        console.error(err);
        setError('저장하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <SplitDialogShell
      title={split ? '분할 편집' : '직접 만들기'}
      labelId="split-edit-title"
      onClose={onClose}
      busy={isPending}
    >
      <form onSubmit={submit} className="flex flex-col gap-4.5">
        <label className={FIELD_LABEL}>
          이름
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={WORKOUT_SPLIT_NAME_MAX}
            placeholder="예: 하체 A"
            autoFocus
            className={FIELD_INPUT}
          />
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1.5 text-sm font-semibold text-ink-soft">
            담을 종목 <span className="font-normal text-ink-muted">· {selected.size}개</span>
          </legend>
          {exercises.length === 0 ? (
            <p className="text-sm text-ink-muted">먼저 운동 종목을 추가해보세요.</p>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-0.5 not-first-of-type:mt-3">
                <span className="text-[13px] font-semibold text-ink-muted">{GROUP_LABEL[g.key]}</span>
                <div className="grid grid-cols-2 gap-x-3">
                  {g.items.map((ex) => {
                    const on = selected.has(ex.id);
                    return (
                      <label key={ex.id} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(ex.id)}
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
                        <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </fieldset>

        {error ? <p className="text-[13px] text-alert">{error}</p> : null}

        <div className="flex items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isPending}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm text-ink-soft hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              예시 보기
            </button>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
          <button type="button" onClick={onClose} disabled={isPending} className={`${BUTTON_SECONDARY} min-h-11 px-4.5`}>
            취소
          </button>
          {/* 새로 만들 땐 이름과 종목 1개 이상이 있어야 — 빈 분할을 실수로 만들지 않게 */}
          <button
            type="submit"
            disabled={isPending || (!split && (!name.trim() || selected.size === 0))}
            className={`${BUTTON_PRIMARY} min-h-11`}
          >
            {isPending ? '저장 중…' : split ? '저장' : '만들기'}
          </button>
          </span>
        </div>
      </form>
    </SplitDialogShell>
  );
}
