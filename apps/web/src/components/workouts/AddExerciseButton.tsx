'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, X } from 'lucide-react';
import { createExercise, patchWorkoutSplit } from '../../lib/api';
import { TargetMuscleSelect } from './TargetMuscleSelect';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_CLOSE } from '../jobs/cells/popover-style';

const FIELD_LABEL = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-soft';
const FIELD_INPUT =
  'min-h-11 w-full min-w-0 rounded-md border border-btn-border bg-surface px-3 text-[15px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-primary';

const DEFAULT_SETS = 3;
const DEFAULT_REP_MIN = 8;
const DEFAULT_REP_MAX = 12;

/** 분할 탭을 보고 있을 때 — 새 종목을 그 분할에도 담음 */
export type AddToSplit = { id: string; name: string; exerciseIds: string[] };

export function AddExerciseButton({
  variant = 'outline',
  split,
}: {
  variant?: 'outline' | 'primary' | 'link';
  split?: AddToSplit | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'link' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 cursor-pointer items-center text-sm text-heading hover:underline"
        >
          종목 추가하기 ›
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${variant === 'primary' ? BUTTON_PRIMARY : BUTTON_SECONDARY} gap-1`}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          종목 추가
        </button>
      )}
      {open ? <AddExerciseModal split={split ?? null} onRequestClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AddExerciseModal({
  split,
  onRequestClose,
}: {
  split: AddToSplit | null;
  onRequestClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [defaultSets, setDefaultSets] = useState(String(DEFAULT_SETS));
  const [repMin, setRepMin] = useState(String(DEFAULT_REP_MIN));
  const [repMax, setRepMax] = useState(String(DEFAULT_REP_MAX));
  const [error, setError] = useState<string | null>(null);
  // 보고 있는 분할에 같이 담기 — 기본 켜짐(스트레칭처럼 담기 싫으면 끔)
  const [addToSplit, setAddToSplit] = useState(true);
  // 종목은 만들었는데 분할에 못 담은 상태 — 다시 누르면 종목이 또 생기므로 [닫기]만
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => nameRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onRequestClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPending, onRequestClose]);

  function submit() {
    const trimmedName = name.trim();
    const trimmedMuscle = targetMuscle.trim();
    if (!trimmedName) {
      setError('운동 이름을 입력하세요');
      nameRef.current?.focus();
      return;
    }
    const sets = Number(defaultSets);
    const rMin = Number(repMin);
    const rMax = Number(repMax);
    if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
      setError('세트 수는 1~20 사이 숫자로 적어주세요.');
      return;
    }
    if (!Number.isInteger(rMin) || rMin < 1 || rMin > 100) {
      setError('최소 횟수는 1~100 사이 숫자로 적어주세요.');
      return;
    }
    if (!Number.isInteger(rMax) || rMax < 1 || rMax > 100) {
      setError('최대 횟수는 1~100 사이 숫자로 적어주세요.');
      return;
    }
    if (rMin > rMax) {
      setError('최소 횟수가 최대보다 클 수 없어요.');
      return;
    }

    startTransition(async () => {
      try {
        const ex = await createExercise({
          name: trimmedName,
          targetMuscle: trimmedMuscle || undefined,
          defaultSets: sets,
          repMin: rMin,
          repMax: rMax,
        });
        if (split && addToSplit) {
          try {
            await patchWorkoutSplit(split.id, { exerciseIds: [...split.exerciseIds, ex.id] });
          } catch (err) {
            console.error(err);
            router.refresh();
            setCreated(true);
            setError(`종목은 추가했지만 ${split.name}에 담지 못했어요. 분할 관리에서 넣어주세요.`);
            return;
          }
        }
        router.refresh();
        onRequestClose();
      } catch (err) {
        console.error(err);
        setError('추가하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-exercise-title"
      // Close only on real backdrop click. useOutsideClick would fire on
      // the Select's portal popover (rendered to body, outside cardRef).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onRequestClose();
      }}
    >
      <div className="w-full max-w-120 rounded-lg bg-surface px-7 py-6 font-plex text-ink shadow-xl">
        <div className="-mr-2.5 mb-4.5 flex items-center justify-between gap-2">
          <h2 id="add-exercise-title" className="text-xl font-bold">
            새 종목
          </h2>
          <button
            type="button"
            onClick={() => !isPending && onRequestClose()}
            disabled={isPending}
            className={POPOVER_CLOSE.replace('-mr-2 ', '')}
            aria-label="닫기"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4.5">
          <div className={FIELD_LABEL}>
            <label htmlFor="add-ex-name">이름</label>
            <input
              id="add-ex-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={100}
              placeholder="예: 스쿼트"
              className={FIELD_INPUT}
            />
          </div>

          <div className={FIELD_LABEL}>
            <label htmlFor="add-ex-muscle">타겟 부위</label>
            <TargetMuscleSelect
              id="add-ex-muscle"
              value={targetMuscle}
              onChange={setTargetMuscle}
              disabled={isPending}
              className="min-h-11 w-full justify-between rounded-md border border-btn-border bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={FIELD_LABEL}>
              <label htmlFor="add-ex-sets">기본 세트 수</label>
              <span className="flex items-center gap-2">
                <input
                  id="add-ex-sets"
                  type="text"
                  inputMode="numeric"
                  value={defaultSets}
                  onChange={(e) => setDefaultSets(e.target.value)}
                  className={FIELD_INPUT}
                />
                <span className="font-normal">세트</span>
              </span>
            </div>
            <fieldset className={FIELD_LABEL}>
              <legend className="mb-1.5">목표 횟수</legend>
              <span className="flex items-center gap-2">
                <input
                  id="add-ex-rmin"
                  type="text"
                  inputMode="numeric"
                  aria-label="최소 횟수"
                  value={repMin}
                  onChange={(e) => setRepMin(e.target.value)}
                  className={FIELD_INPUT}
                />
                <span className="font-normal">~</span>
                <input
                  id="add-ex-rmax"
                  type="text"
                  inputMode="numeric"
                  aria-label="최대 횟수"
                  value={repMax}
                  onChange={(e) => setRepMax(e.target.value)}
                  className={FIELD_INPUT}
                />
                <span className="font-normal">회</span>
              </span>
            </fieldset>
          </div>

          {split ? (
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]">
              <input
                type="checkbox"
                checked={addToSplit}
                onChange={(e) => setAddToSplit(e.target.checked)}
                disabled={isPending || created}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
                  addToSplit ? 'bg-primary' : 'border-[1.5px] border-check-off'
                }`}
              >
                {addToSplit ? <Check className="h-3.25 w-3.25 text-white dark:text-paper" strokeWidth={3.2} /> : null}
              </span>
              <span>
                <strong className="font-semibold">{split.name}</strong>에도 담기
              </span>
            </label>
          ) : null}

          {error ? <p className="text-[13px] text-alert">{error}</p> : null}

          {created ? (
            <div className="flex justify-end">
              <button type="button" onClick={onRequestClose} className={`${BUTTON_SECONDARY} min-h-11 px-4.5`}>
                닫기
              </button>
            </div>
          ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRequestClose}
              disabled={isPending}
              className={`${BUTTON_SECONDARY} min-h-11 px-4.5`}
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className={`${BUTTON_PRIMARY} min-h-11`}
            >
              {isPending ? '추가 중…' : '추가하기'}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
