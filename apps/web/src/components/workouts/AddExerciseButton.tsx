'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, X } from 'lucide-react';
import { createExercise, patchWorkoutSplit } from '../../lib/api';
import { useIsMobile } from '../../lib/useIsMobile';
import { TargetMuscleSelect, TARGET_MUSCLE_CHOICES } from './TargetMuscleSelect';
import { BottomSheet } from '../ui/BottomSheet';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_CLOSE } from '../jobs/cells/popover-style';

const FIELD_LABEL = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-soft';
const FIELD_INPUT =
  'min-h-11 w-full min-w-0 rounded-md border border-btn-border bg-surface px-3 text-[15px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-primary';
// 모바일 시트 숫자 칸 — 세트 · 횟수가 한 줄에 들어가게 좁게
const FIELD_INPUT_NUM = `${FIELD_INPUT.replace('w-full ', '')} w-14 text-center`;

const DEFAULT_SETS = 3;
const DEFAULT_REP_MIN = 8;
const DEFAULT_REP_MAX = 12;

/** 분할 탭을 보고 있을 때 — 새 종목을 그 분할에도 담음 */
export type AddToSplit = { id: string; name: string; exerciseIds: string[] };

type Variant = 'outline' | 'primary' | 'link' | 'text';

const LINK_CLASS = 'inline-flex min-h-10 cursor-pointer items-center text-sm text-heading hover:underline';

function TriggerButton({ variant, onClick, className }: { variant: Variant; onClick: () => void; className: string }) {
  if (variant === 'link') {
    return (
      <button type="button" onClick={onClick} className={`${LINK_CLASS} ${className}`}>
        종목 추가하기 ›
      </button>
    );
  }
  const cls =
    variant === 'text'
      ? 'inline-flex min-h-10 cursor-pointer items-center gap-1 px-1 text-sm font-medium text-heading'
      : `${variant === 'primary' ? BUTTON_PRIMARY : BUTTON_SECONDARY} gap-1`;
  return (
    <button type="button" onClick={onClick} className={`${cls} ${className}`}>
      <Plus className={variant === 'text' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.2} aria-hidden />
      종목 추가
    </button>
  );
}

export function AddExerciseButton({
  variant = 'outline',
  mobileVariant,
  split,
  defaultOpen = false,
}: {
  variant?: Exclude<Variant, 'text'>;
  /** 모바일 버튼 모양(없으면 variant 그대로). 'none'이면 모바일에선 안 보임 */
  mobileVariant?: Variant | 'none';
  split?: AddToSplit | null;
  /** ?add=1로 들어왔을 때 창을 바로 엶 */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();
  // 연 뒤엔 주소에서 add를 지움 — 새로고침·뒤로 가기로 다시 열리지 않게(서버 다시 안 부름)
  useEffect(() => {
    if (!defaultOpen) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('add')) return;
    url.searchParams.delete('add');
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
  }, [defaultOpen]);
  const mv = mobileVariant ?? variant;
  const close = () => setOpen(false);
  return (
    <>
      {mv === variant ? (
        <TriggerButton variant={variant} onClick={() => setOpen(true)} className="" />
      ) : (
        <>
          {mv !== 'none' ? (
            <TriggerButton variant={mv} onClick={() => setOpen(true)} className="md:hidden" />
          ) : null}
          <TriggerButton variant={variant} onClick={() => setOpen(true)} className="max-md:hidden" />
        </>
      )}
      {/* 모바일은 아래 시트(칸이 5개라 키보드가 올라오면 가운데 창은 위가 잘림), 데스크톱은 가운데 창 */}
      {isMobile ? (
        <AddExerciseSheet open={open} split={split ?? null} onRequestClose={close} />
      ) : open ? (
        <AddExerciseModal split={split ?? null} onRequestClose={close} />
      ) : null}
    </>
  );
}

// 검사 · 저장은 시트와 가운데 창이 같이 씀
function useAddExerciseForm(
  split: AddToSplit | null,
  onDone: () => void,
  nameRef: React.RefObject<HTMLInputElement | null>,
) {
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
            setError(`종목은 추가했지만 ${split.name}에 담지 못했어요. 설정의 분할에서 넣어주세요.`);
            return;
          }
        }
        router.refresh();
        onDone();
      } catch (err) {
        console.error(err);
        setError('추가하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return {
    name,
    setName: (v: string) => {
      setName(v);
      if (error) setError(null);
    },
    targetMuscle,
    setTargetMuscle,
    defaultSets,
    setDefaultSets,
    repMin,
    setRepMin,
    repMax,
    setRepMax,
    error,
    addToSplit,
    setAddToSplit,
    created,
    isPending,
    submit,
  };
}

type Form = ReturnType<typeof useAddExerciseForm>;

function SplitCheckbox({ split, f }: { split: AddToSplit; f: Form }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]">
      <input
        type="checkbox"
        checked={f.addToSplit}
        onChange={(e) => f.setAddToSplit(e.target.checked)}
        disabled={f.isPending || f.created}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
          f.addToSplit ? 'bg-primary' : 'border-[1.5px] border-check-off'
        }`}
      >
        {f.addToSplit ? <Check className="h-3.25 w-3.25 text-white dark:text-paper" strokeWidth={3.2} /> : null}
      </span>
      <span>
        <strong className="font-semibold">{split.name}</strong>에도 담기
      </span>
    </label>
  );
}

// 모바일: 아래 시트 "종목 추가" — 부위는 칩 6개, 세트 · 횟수는 한 줄, 아래 줄 [취소] [추가하기].
function AddExerciseSheet({
  open,
  split,
  onRequestClose,
}: {
  open: boolean;
  split: AddToSplit | null;
  onRequestClose: () => void;
}) {
  // 시트는 닫히는 애니메이션 뒤 내용을 통째로 지움 → 열 때마다 빈 칸으로 시작
  return (
    <BottomSheet open={open} onClose={onRequestClose} title="종목 추가" className="md:hidden">
      <AddExerciseSheetBody split={split} onRequestClose={onRequestClose} />
    </BottomSheet>
  );
}

function AddExerciseSheetBody({ split, onRequestClose }: { split: AddToSplit | null; onRequestClose: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const f = useAddExerciseForm(split, onRequestClose, nameRef);
  const close = () => !f.isPending && onRequestClose();
  return (
    <div className="flex flex-col gap-4.5 px-5 pt-2 pb-3">
      <div className={FIELD_LABEL}>
        <label htmlFor="add-ex-name-m">이름</label>
        <input
          id="add-ex-name-m"
          ref={nameRef}
          type="text"
          value={f.name}
          onChange={(e) => f.setName(e.target.value)}
          enterKeyHint="done"
          maxLength={100}
          placeholder="예: 스쿼트"
          className={FIELD_INPUT}
        />
      </div>

      <div role="radiogroup" aria-labelledby="add-ex-muscle-m" className={FIELD_LABEL}>
        <span id="add-ex-muscle-m">타겟 부위</span>
        <span className="flex flex-wrap gap-2">
          {TARGET_MUSCLE_CHOICES.map((o) => {
            const on = o.value === f.targetMuscle;
            return (
              <button
                key={o.value || 'none'}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={f.isPending}
                onClick={() => f.setTargetMuscle(o.value)}
                className={`inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-[15px] ${
                  on
                    ? 'bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                    : 'border border-btn-border bg-surface font-normal text-ink-soft'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className={FIELD_LABEL}>
          <label htmlFor="add-ex-sets-m">기본 세트</label>
          <span className="flex items-center gap-2">
            <input
              id="add-ex-sets-m"
              type="text"
              inputMode="numeric"
              value={f.defaultSets}
              onChange={(e) => f.setDefaultSets(e.target.value)}
              className={`${FIELD_INPUT_NUM}`}
            />
            <span className="font-normal">세트</span>
          </span>
        </div>
        <fieldset className={FIELD_LABEL}>
          <legend className="mb-1.5">목표 횟수</legend>
          <span className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              aria-label="최소 횟수"
              value={f.repMin}
              onChange={(e) => f.setRepMin(e.target.value)}
              className={`${FIELD_INPUT_NUM}`}
            />
            <span className="font-normal">~</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="최대 횟수"
              value={f.repMax}
              onChange={(e) => f.setRepMax(e.target.value)}
              className={`${FIELD_INPUT_NUM}`}
            />
            <span className="font-normal">회</span>
          </span>
        </fieldset>
      </div>

      {split ? <SplitCheckbox split={split} f={f} /> : null}

      {f.error ? (
        <p className="text-[13px] text-alert" role="alert">
          {f.error}
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-divider pt-3">
        {f.created ? (
          <button type="button" onClick={onRequestClose} className={`${BUTTON_SECONDARY} min-h-11 flex-1 justify-center`}>
            닫기
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={close}
              disabled={f.isPending}
              className={`${BUTTON_SECONDARY} min-h-11 flex-1 justify-center`}
            >
              취소
            </button>
            <button
              type="button"
              onClick={f.submit}
              disabled={f.isPending}
              className={`${BUTTON_PRIMARY} min-h-11 flex-1 justify-center`}
            >
              {f.isPending ? '추가 중…' : '추가하기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddExerciseModal({
  split,
  onRequestClose,
}: {
  split: AddToSplit | null;
  onRequestClose: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const f = useAddExerciseForm(split, onRequestClose, nameRef);
  const { isPending } = f;

  useEffect(() => {
    queueMicrotask(() => nameRef.current?.focus());
  }, [nameRef]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onRequestClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPending, onRequestClose]);

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
              value={f.name}
              onChange={(e) => f.setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  f.submit();
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
              value={f.targetMuscle}
              onChange={f.setTargetMuscle}
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
                  value={f.defaultSets}
                  onChange={(e) => f.setDefaultSets(e.target.value)}
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
                  value={f.repMin}
                  onChange={(e) => f.setRepMin(e.target.value)}
                  className={FIELD_INPUT}
                />
                <span className="font-normal">~</span>
                <input
                  id="add-ex-rmax"
                  type="text"
                  inputMode="numeric"
                  aria-label="최대 횟수"
                  value={f.repMax}
                  onChange={(e) => f.setRepMax(e.target.value)}
                  className={FIELD_INPUT}
                />
                <span className="font-normal">회</span>
              </span>
            </fieldset>
          </div>

          {split ? <SplitCheckbox split={split} f={f} /> : null}

          {f.error ? <p className="text-[13px] text-alert">{f.error}</p> : null}

          {f.created ? (
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
              onClick={f.submit}
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
