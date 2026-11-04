'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import {
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  type CompanyType,
  type CompanyType1,
} from '@repo/shared';
import { createCompany } from '../../lib/api';
import { Select } from '../ui/Select';
import {
  BUTTON_PRIMARY,
  POPOVER_CHECKBOX_LABEL,
  POPOVER_INPUT,
} from './cells/popover-style';

const DEFAULT_TYPE1: CompanyType1 = 'sme';

const FIELD_LABEL = 'text-sm font-semibold text-ink-soft';
const SELECT_TRIGGER = `${POPOVER_INPUT} min-h-11 cursor-pointer justify-between text-[15px]`;

// 상단 도구 줄과 빈 상태가 같이 씀 (docs/design/rally-jobs-parts.html '회사 추가').
export function AddCompanyButton({
  companyTypes,
  label = '추가하기',
}: {
  companyTypes: CompanyType[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BUTTON_PRIMARY} min-h-11 gap-1.5 font-plex md:min-h-10`}
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        {label}
      </button>
      {open ? (
        <AddCompanyModal
          companyTypes={companyTypes}
          onRequestClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function AddCompanyModal({
  companyTypes,
  onRequestClose,
}: {
  companyTypes: CompanyType[];
  onRequestClose: () => void;
}) {
  const router = useRouter();
  const defaultType2 = companyTypes[0]?.key ?? '';
  const [name, setName] = useState('');
  const [type2, setType2] = useState<string>(defaultType2);
  const [type1, setType1] = useState<CompanyType1>(DEFAULT_TYPE1);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Mount 시 name 필드에 자동 포커스. 폼 state 리셋용 useEffect는 필요 없음
  // — 모달 body 자체가 open마다 fresh mount되므로 useState initial value가 곧
  // 리셋 지점.
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
    const trimmed = name.trim();
    if (!trimmed) {
      setError('회사명을 입력하세요');
      nameRef.current?.focus();
      return;
    }
    startTransition(async () => {
      try {
        // 새로 추가하는 회사는 대체로 지금 채용중이라 기본값을 true로.
        // 채용 마감 시점에 사용자가 수동으로 off. 이 기본값 덕에 D-7 리스트/
        // D-1 알림에서 놓치지 않음.
        await createCompany({ name: trimmed, type1, type2, isHiring: true, isRolling });
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
      aria-labelledby="add-company-title"
      // Close only on real backdrop click. useOutsideClick would fire on
      // the Select's portal popover (rendered to body, outside cardRef).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onRequestClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4.5 rounded-lg bg-surface p-7 font-plex text-ink shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 id="add-company-title" className="text-xl font-bold">
            회사 추가
          </h2>
          <button
            type="button"
            onClick={() => !isPending && onRequestClose()}
            disabled={isPending}
            aria-label="닫기"
            className="-mr-2 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover hover:text-ink disabled:opacity-50"
          >
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-name" className={FIELD_LABEL}>
            회사명
          </label>
          <input
            id="add-name"
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
            maxLength={200}
            placeholder="회사명 입력"
            className={`${POPOVER_INPUT} min-h-11 text-base md:text-[15px]`}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="add-type2" className={FIELD_LABEL}>
              유형
            </label>
            {companyTypes.length === 0 ? (
              <div className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-dashed border-btn-border px-3">
                <span className="text-sm text-ink-muted">아직 유형이 없어요</span>
                <Link
                  href="/settings/company-types"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-heading"
                >
                  유형 먼저 추가 →
                </Link>
              </div>
            ) : (
              <Select
                id="add-type2"
                value={type2}
                onChange={setType2}
                options={companyTypes.map((t) => ({ value: t.key, label: t.label }))}
                ariaLabel="유형"
                tone="rally"
                triggerClassName={SELECT_TRIGGER}
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="add-type1" className={FIELD_LABEL}>
              규모
            </label>
            <Select
              id="add-type1"
              value={type1}
              onChange={(v) => setType1(v as CompanyType1)}
              options={COMPANY_TYPE_1_VALUES.map((v) => ({ value: v, label: COMPANY_TYPE_1_LABELS[v] }))}
              ariaLabel="규모"
              tone="rally"
              triggerClassName={SELECT_TRIGGER}
            />
          </div>
        </div>

        <label className={POPOVER_CHECKBOX_LABEL}>
          <input
            type="checkbox"
            checked={isRolling}
            onChange={(e) => setIsRolling(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          상시채용 (마감일 없음)
        </label>

        {error ? <p className="text-sm text-alert">{error}</p> : null}

        <p className="text-sm text-ink-muted">
          우선순위, 지원상태 등 나머지는 표에서 바로 편집하세요.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRequestClose}
            disabled={isPending}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-btn-border bg-btn-bg px-4.5 text-[15px] font-medium text-ink hover:border-heading disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending || companyTypes.length === 0}
            title={companyTypes.length === 0 ? '설정에서 유형을 먼저 추가해보세요' : undefined}
            className={`${BUTTON_PRIMARY} min-h-11 px-5 text-[15px]`}
          >
            {isPending ? '추가 중...' : '추가하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
