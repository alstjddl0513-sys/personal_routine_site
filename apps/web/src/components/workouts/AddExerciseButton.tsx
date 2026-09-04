'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { createExercise } from '../../lib/api';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { TargetMuscleSelect } from './TargetMuscleSelect';

const DEFAULT_SETS = 3;
const DEFAULT_REP_MIN = 8;
const DEFAULT_REP_MAX = 12;

export function AddExerciseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [defaultSets, setDefaultSets] = useState(String(DEFAULT_SETS));
  const [repMin, setRepMin] = useState(String(DEFAULT_REP_MIN));
  const [repMax, setRepMax] = useState(String(DEFAULT_REP_MAX));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useOutsideClick(cardRef, () => !isPending && setOpen(false), open);

  useEffect(() => {
    if (open) {
      setName('');
      setTargetMuscle('');
      setDefaultSets(String(DEFAULT_SETS));
      setRepMin(String(DEFAULT_REP_MIN));
      setRepMax(String(DEFAULT_REP_MAX));
      setError(null);
      queueMicrotask(() => nameRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPending]);

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
      setError('세트 수는 1~20 정수');
      return;
    }
    if (!Number.isInteger(rMin) || rMin < 1 || rMin > 100) {
      setError('최소 횟수는 1~100 정수');
      return;
    }
    if (!Number.isInteger(rMax) || rMax < 1 || rMax > 100) {
      setError('최대 횟수는 1~100 정수');
      return;
    }
    if (rMin > rMax) {
      setError('최소 횟수는 최대 횟수 이하여야 합니다');
      return;
    }

    startTransition(async () => {
      try {
        await createExercise({
          name: trimmedName,
          targetMuscle: trimmedMuscle || undefined,
          defaultSets: sets,
          repMin: rMin,
          repMax: rMax,
        });
        router.refresh();
        setOpen(false);
      } catch (err) {
        console.error(err);
        setError('추가에 실패했습니다');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 md:min-h-0 md:py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" aria-hidden />
        운동 추가
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-exercise-title"
        >
          <div
            ref={cardRef}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="add-exercise-title" className="text-base font-semibold">
                운동 추가
              </h2>
              <button
                type="button"
                onClick={() => !isPending && setOpen(false)}
                disabled={isPending}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="add-ex-name" className="text-xs text-zinc-500 dark:text-zinc-400">
                  이름
                </label>
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
                  className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="add-ex-muscle" className="text-xs text-zinc-500 dark:text-zinc-400">
                  타겟 부위 <span className="text-zinc-400">(선택)</span>
                </label>
                <TargetMuscleSelect
                  id="add-ex-muscle"
                  value={targetMuscle}
                  onChange={setTargetMuscle}
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="add-ex-sets" className="text-xs text-zinc-500 dark:text-zinc-400">
                    세트
                  </label>
                  <input
                    id="add-ex-sets"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(e.target.value)}
                    className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="add-ex-rmin" className="text-xs text-zinc-500 dark:text-zinc-400">
                    최소 회
                  </label>
                  <input
                    id="add-ex-rmin"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={repMin}
                    onChange={(e) => setRepMin(e.target.value)}
                    className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="add-ex-rmax" className="text-xs text-zinc-500 dark:text-zinc-400">
                    최대 회
                  </label>
                  <input
                    id="add-ex-rmax"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={repMax}
                    onChange={(e) => setRepMax(e.target.value)}
                    className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              ) : null}

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                순서는 카드 hover ↑↓ 버튼으로 조정하세요.
              </p>

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center rounded px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isPending ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
