'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  planSplitTemplate,
  type Exercise,
  type WorkoutSplit,
  type WorkoutSplitTemplate,
} from '@repo/shared';
import { createWorkoutSplitsFromTemplate } from '../../../lib/api';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '../../jobs/cells/popover-style';
import { SplitDialogShell, SplitEditDialog } from './SplitEditDialog';

const TEMPLATES: { kind: WorkoutSplitTemplate; label: string }[] = [
  { kind: 'upper-lower', label: '상체 / 하체' },
  { kind: 'push-pull-legs', label: '밀기 / 당기기 / 하체' },
  { kind: 'full-body', label: '전신' },
];

// 예시 카드 설명 = 내 종목이 실제로 몇 개씩 담기는지(0개도 표시) — 고르는 데 도움이 되게.
function countHint(kind: WorkoutSplitTemplate, exercises: Exercise[]): string {
  const plan = planSplitTemplate(kind, exercises);
  if (kind === 'full-body') return `종목 ${exercises.length}개 전부`;
  return plan.splits.map((sp) => `${sp.name} ${sp.exerciseIds.length}개`).join(' · ');
}

// "A는" / "A, B는" — 마지막 이름 받침 따라 조사.
function withTopic(names: string[]): string {
  const joined = names.join(', ');
  const last = joined.at(-1) ?? '';
  const code = last.charCodeAt(0) - 0xac00;
  // 숫자로 끝나면 읽는 소리 기준(일·삼·육·칠·팔·영 = 받침)
  const hasBatchim = /\d/.test(last)
    ? '013678'.includes(last)
    : code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${joined}${hasBatchim ? '은' : '는'}`;
}

// 분할 만들기: 예시 고르기 → 미리보기 → 만들기, 또는 직접 만들기(편집 창).
// 운동 기록 화면(첫 사용 안내)과 설정 '분할'이 같이 씀.
export function SplitCreateDialog({
  exercises,
  onClose,
  onCreated,
}: {
  /** 보관 안 한 종목 */
  exercises: Exercise[];
  onClose: () => void;
  onCreated: (splits: WorkoutSplit[]) => void;
}) {
  const [step, setStep] = useState<'pick' | 'custom' | WorkoutSplitTemplate>('pick');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (step === 'custom') {
    return (
      <SplitEditDialog
        split={null}
        exercises={exercises}
        onClose={onClose}
        onSaved={(s) => onCreated([s])}
        onBack={() => setStep('pick')}
      />
    );
  }

  if (step === 'pick') {
    return (
      <SplitDialogShell title="분할 만들기" labelId="split-create-title" onClose={onClose}>
        <p className="text-sm text-ink-soft">
          만든 순서대로 돌아가며 운동해요. 상체를 했다면 다음엔 하체 차례예요.
        </p>
        <ul className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <li key={t.kind}>
              <button
                type="button"
                onClick={() => setStep(t.kind)}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 text-left hover:border-heading"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[13px] text-ink-muted">{countHint(t.kind, exercises)}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setStep('custom')}
          className="inline-flex min-h-10 cursor-pointer items-center self-start text-sm text-heading hover:underline"
        >
          직접 만들기 ›
        </button>
      </SplitDialogShell>
    );
  }

  // 미리보기 — 서버와 같은 규칙(planSplitTemplate)이라 보이는 대로 만들어짐.
  const kind = step;
  const plan = planSplitTemplate(kind, exercises);
  const nameById = new Map(exercises.map((e) => [e.id, e.name]));
  const names = (ids: string[]) => ids.map((id) => nameById.get(id)).filter((n): n is string => !!n);
  const label = TEMPLATES.find((t) => t.kind === kind)?.label ?? '';

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        onCreated(await createWorkoutSplitsFromTemplate(kind));
      } catch (err) {
        console.error(err);
        setError('분할을 만들지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <SplitDialogShell title={`${label} 만들기`} labelId="split-preview-title" onClose={onClose} busy={isPending}>
      {/* 누를 수 없는 정보라 카드 모양 X(고르는 카드와 헷갈림) — divider 번호 목록, 번호 = 돌아가는 순서 */}
      <ol className="border-y border-divider">
        {plan.splits.map((sp, i) => {
          const list = names(sp.exerciseIds);
          return (
            <li
              key={sp.name}
              className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 gap-y-1 border-divider px-0.5 py-3 not-last:border-b"
            >
              <span className="text-[15px] font-bold text-ink-muted">{i + 1}</span>
              <span className="text-[15px] font-bold text-ink">{sp.name}</span>
              <span />
              <span className={`text-[13px] ${list.length ? 'text-ink-soft' : 'text-ink-muted'}`}>
                {list.length ? list.join(' · ') : '담길 종목 없음 — 만든 뒤 직접 골라주세요'}
              </span>
            </li>
          );
        })}
      </ol>
      {plan.unassignedIds.length > 0 ? (
        <div className="flex flex-col gap-0.5 text-[13px]">
          <p className="flex items-center gap-2 text-warn">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
            {withTopic(names(plan.unassignedIds))} 어느 분할에도 안 담겨요.
          </p>
          <p className="pl-3.5 text-ink-muted">
            &lsquo;전체&rsquo; 탭에서 기록할 수 있고, 설정의 분할에서 언제든 넣을 수 있어요.
          </p>
          {plan.note ? <p className="pl-3.5 text-ink-muted">{plan.note}</p> : null}
        </div>
      ) : null}
      {error ? <p className="text-[13px] text-alert">{error}</p> : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep('pick')}
          disabled={isPending}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm text-ink-soft hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          다른 예시
        </button>
        <span className="flex gap-2">
          <button type="button" onClick={onClose} disabled={isPending} className={`${BUTTON_SECONDARY} min-h-11 px-4.5`}>
            취소
          </button>
          <button type="button" onClick={create} disabled={isPending} className={`${BUTTON_PRIMARY} min-h-11`}>
            {isPending ? '만드는 중…' : '만들기'}
          </button>
        </span>
      </div>
    </SplitDialogShell>
  );
}
