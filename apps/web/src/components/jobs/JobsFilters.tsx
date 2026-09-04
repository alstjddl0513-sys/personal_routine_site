'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ChevronDown,
  Heart,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type CompanyType,
} from '@repo/shared';
import { AddCompanyButton } from './AddCompanyButton';

const STATUS_CHIP_STYLE: Record<ApplicationStatus, string> = {
  not_applied: 'border-zinc-300 bg-zinc-50 text-zinc-600',
  applied: 'border-blue-300 bg-blue-50 text-blue-700',
  document_passed: 'border-sky-300 bg-sky-50 text-sky-700',
  document_failed: 'border-zinc-300 bg-zinc-50 text-zinc-400 line-through',
  interview_1_passed: 'border-cyan-300 bg-cyan-50 text-cyan-700',
  interview_1_failed: 'border-zinc-300 bg-zinc-50 text-zinc-400 line-through',
  interview_2_passed: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  interview_2_failed: 'border-zinc-300 bg-zinc-50 text-zinc-400 line-through',
  final_passed: 'border-amber-300 bg-amber-100 text-amber-800 font-semibold',
  final_failed: 'border-zinc-300 bg-zinc-50 text-zinc-400 line-through',
  withdrawn: 'border-zinc-300 bg-zinc-100 text-zinc-500 italic',
};

export function JobsFilters({ companyTypes }: { companyTypes: CompanyType[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const type2Set = useMemo(() => parseCsv(searchParams.get('type2')), [searchParams]);
  const type1Set = useMemo(() => parseCsv(searchParams.get('type1')), [searchParams]);
  const prioritySet = useMemo(
    () => parseCsv(searchParams.get('priority')),
    [searchParams],
  );
  const statusSet = useMemo(() => parseCsv(searchParams.get('status')), [searchParams]);
  const currentHiring = searchParams.get('hiring') === '1';
  const currentFavorite = searchParams.get('favorite') === '1';
  const currentSearch = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const lastPushedRef = useRef(currentSearch);

  useEffect(() => {
    if (currentSearch !== lastPushedRef.current) {
      setSearchInput(currentSearch);
      lastPushedRef.current = currentSearch;
    }
  }, [currentSearch]);

  useEffect(() => {
    if (searchInput === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = searchInput;
      pushPatch({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function pushPatch(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => {
      router.push(next.size ? `/jobs?${next.toString()}` : '/jobs');
    });
  }

  function toggleMulti(key: string, values: Set<string>, v: string) {
    const next = new Set(values);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    pushPatch({ [key]: next.size ? Array.from(next).join(',') : null });
  }

  function clearAll() {
    lastPushedRef.current = '';
    setSearchInput('');
    startTransition(() => {
      router.push('/jobs');
    });
  }

  const anyActive =
    type2Set.size ||
    type1Set.size ||
    prioritySet.size ||
    statusSet.size ||
    currentHiring ||
    currentFavorite ||
    currentSearch;

  // Sum only the chip-group filters — search/favorite/hiring have their own
  // controls above the disclosure and don't belong in the mobile chip badge.
  const chipFilterCount =
    type2Set.size + type1Set.size + prioritySet.size + statusSet.size;

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="회사명 검색"
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <AddCompanyButton companyTypes={companyTypes} />
        <button
          type="button"
          onClick={() => pushPatch({ favorite: currentFavorite ? null : '1' })}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            currentFavorite
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          aria-pressed={currentFavorite}
        >
          <Heart
            className={`h-4 w-4 ${currentFavorite ? 'fill-current' : ''}`}
            aria-hidden
          />
          즐겨찾기
        </button>
        {anyActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            초기화
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="inline-flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 md:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          필터
          {chipFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[10px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              {chipFilterCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        className={`${mobileOpen ? '' : 'hidden'} md:block rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950`}
      >
        <div className="mb-2 flex justify-end md:hidden">
          <Link
            href="/settings/company-types"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            유형 관리
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 text-sm md:grid-cols-[auto_1fr] md:items-center">
          <FilterRow
            label="유형"
            trailing={
              <Link
                href="/settings/company-types"
                className="ml-auto hidden items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:inline-flex dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                유형 관리
              </Link>
            }
          >
            {companyTypes.map((t) => (
              <Chip
                key={t.key}
                active={type2Set.has(t.key)}
                onClick={() => toggleMulti('type2', type2Set, t.key)}
              >
                {t.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="규모">
            {COMPANY_TYPE_1_VALUES.map((v) => (
              <Chip
                key={v}
                active={type1Set.has(v)}
                onClick={() => toggleMulti('type1', type1Set, v)}
              >
                {COMPANY_TYPE_1_LABELS[v]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="우선순위">
            {PRIORITY_VALUES.map((v) => (
              <Chip
                key={v}
                active={prioritySet.has(v)}
                onClick={() => toggleMulti('priority', prioritySet, v)}
              >
                {PRIORITY_LABELS[v]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="채용중">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={currentHiring}
                onChange={(e) =>
                  pushPatch({ hiring: e.target.checked ? '1' : null })
                }
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
              />
              채용중만 보기
            </label>
          </FilterRow>
          <FilterRow label="지원상태">
            {APPLICATION_STATUS_VALUES.map((v) => {
              const active = statusSet.has(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleMulti('status', statusSet, v)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? STATUS_CHIP_STYLE[v] + ' ring-2 ring-zinc-900 dark:ring-zinc-100'
                      : STATUS_CHIP_STYLE[v] + ' opacity-60 hover:opacity-100'
                  }`}
                >
                  {APPLICATION_STATUS_LABELS[v]}
                </button>
              );
            })}
          </FilterRow>
        </div>
      </div>
    </div>
  );
}

function parseCsv(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

function FilterRow({
  label,
  children,
  trailing,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <span className="mt-2 text-xs text-zinc-500 first:mt-0 md:mt-0 md:pt-1 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        {trailing}
      </div>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}
