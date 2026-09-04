'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import {
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  type CompanyType,
  type CompanyType1,
} from '@repo/shared';
import { createCompany } from '../../lib/api';
import { useOutsideClick } from '../../lib/useOutsideClick';

const DEFAULT_TYPE1: CompanyType1 = 'sme';

export function AddCompanyButton({ companyTypes }: { companyTypes: CompanyType[] }) {
  const router = useRouter();
  const defaultType2 = companyTypes[0]?.key ?? '';
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type2, setType2] = useState<string>(defaultType2);
  const [type1, setType1] = useState<CompanyType1>(DEFAULT_TYPE1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useOutsideClick(cardRef, () => !isPending && setOpen(false), open);

  useEffect(() => {
    if (open) {
      setName('');
      setType2(defaultType2);
      setType1(DEFAULT_TYPE1);
      setError(null);
      queueMicrotask(() => nameRef.current?.focus());
    }
  }, [open, defaultType2]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPending]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('회사명을 입력하세요');
      nameRef.current?.focus();
      return;
    }
    startTransition(async () => {
      try {
        await createCompany({ name: trimmed, type1, type2 });
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
        추가하기
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-company-title"
        >
          <div
            ref={cardRef}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="add-company-title" className="text-base font-semibold">
                회사 추가
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
                <label htmlFor="add-name" className="text-xs text-zinc-500 dark:text-zinc-400">
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
                  className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="add-type2" className="text-xs text-zinc-500 dark:text-zinc-400">
                    유형
                  </label>
                  <select
                    id="add-type2"
                    value={type2}
                    onChange={(e) => setType2(e.target.value)}
                    className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {companyTypes.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="add-type1" className="text-xs text-zinc-500 dark:text-zinc-400">
                    규모
                  </label>
                  <select
                    id="add-type1"
                    value={type1}
                    onChange={(e) => setType1(e.target.value as CompanyType1)}
                    className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-500 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {COMPANY_TYPE_1_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {COMPANY_TYPE_1_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              ) : null}

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                우선순위, 지원상태 등 나머지는 표에서 바로 편집하세요.
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
