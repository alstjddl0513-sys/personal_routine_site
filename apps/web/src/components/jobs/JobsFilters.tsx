'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  ChevronDown,
  Heart,
  Printer,
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
  type CompanyType1,
  type Priority,
} from '@repo/shared';
import { AddCompanyButton } from './AddCompanyButton';
import { StatusDot } from './StatusDot';

export interface JobsClientFilters {
  type1: ReadonlySet<CompanyType1>;
  type2: ReadonlySet<string>;
  priority: ReadonlySet<Priority>;
  status: ReadonlySet<ApplicationStatus>;
}

type ClientFilterKey = keyof JobsClientFilters;

// 필터를 두 그룹으로 나눠 처리:
// - URL/SSR 그룹: q(검색), favorite, hiring — 서버가 실제로 fetch를 좁히는 조건
//   이라 여전히 router.push로 SSR 왕복
// - 클라 필터 그룹: type1/type2/priority/status — 이미 데이터셋(~170행)이 로컬에
//   와있어 서버에서 재필터할 이유가 없음. 부모(JobsClientView)가 state를 관리
//   하고 chip 클릭은 콜백 + window.history.replaceState로 URL만 갱신, SSR 왕복
//   자체를 제거해 chip 반응이 즉각
export function JobsFilters({
  companyTypes,
  clientFilters,
  onClientFilterChange,
  onClientClearAll,
  resultCount,
  countAside,
}: {
  companyTypes: CompanyType[];
  clientFilters: JobsClientFilters;
  onClientFilterChange: <K extends ClientFilterKey>(
    key: K,
    next: JobsClientFilters[K],
  ) => void;
  onClientClearAll: () => void;
  /** 필터 적용 후 회사 수 ("N개"). */
  resultCount: number;
  /** "N개" 줄 오른쪽 끝 (열 보기 전환 등). */
  countAside?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentHiring = searchParams.get('hiring') === '1';
  const currentFavorite = searchParams.get('favorite') === '1';
  const currentSearch = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const lastPushedRef = useRef(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentSearch !== lastPushedRef.current) {
      // Kill any in-flight debounce so it doesn't overwrite the external
      // URL change we're about to reflect (e.g., back button while typing).
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchInput(currentSearch);
      lastPushedRef.current = currentSearch;
    }
  }, [currentSearch]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function buildUrl(patch: Record<string, string | null>): string {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    return next.size ? `/jobs?${next.toString()}` : '/jobs';
  }

  function pushPatch(patch: Record<string, string | null>) {
    startTransition(() => {
      router.push(buildUrl(patch));
    });
  }

  // Hover/focus로 SSR-트리거 chip(즐겨찾기)의 URL RSC payload warm-up.
  function prefetchPatch(patch: Record<string, string | null>) {
    router.prefetch(buildUrl(patch));
  }

  // Debounced URL push driven by input event, not an effect
  // (react-hooks/exhaustive-deps used to require pushPatch in deps but
  // that would re-run the effect on every render).
  function updateSearch(next: string) {
    setSearchInput(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next === lastPushedRef.current) return;
    debounceRef.current = setTimeout(() => {
      lastPushedRef.current = next;
      pushPatch({ q: next || null });
    }, 300);
  }

  function toggleClient<K extends ClientFilterKey>(
    key: K,
    values: ReadonlySet<JobsClientFilters[K] extends ReadonlySet<infer T> ? T : never>,
    v: JobsClientFilters[K] extends ReadonlySet<infer T> ? T : never,
  ) {
    const next = new Set(values);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onClientFilterChange(key, next as JobsClientFilters[K]);
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    lastPushedRef.current = '';
    setSearchInput('');
    onClientClearAll();
    startTransition(() => {
      router.push('/jobs');
    });
  }

  const anyActive =
    clientFilters.type2.size ||
    clientFilters.type1.size ||
    clientFilters.priority.size ||
    clientFilters.status.size ||
    currentHiring ||
    currentFavorite ||
    currentSearch;

  // Sum only the chip-group filters — search/favorite/hiring have their own
  // controls above the disclosure and don't belong in the mobile chip badge.
  const chipFilterCount =
    clientFilters.type2.size +
    clientFilters.type1.size +
    clientFilters.priority.size +
    clientFilters.status.size;

  const [mobileOpen, setMobileOpen] = useState(false);

  // 상단 도구 줄 + 필터 칩 (docs/design/rally-jobs.html). 모바일은 칩 묶음을
  // '필터' 버튼으로 접어 두는 구조 그대로.
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">채용 리스트</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative flex w-full items-center sm:w-60">
            <span className="sr-only">회사명 검색</span>
            <Search
              className="absolute left-3 h-4 w-4 text-ink-muted"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="회사명으로 찾기"
              className="min-h-11 w-full rounded-md border border-btn-border bg-surface py-2 pr-3 pl-9 text-base text-ink outline-none placeholder:text-ink-faint focus:border-heading md:min-h-10 md:text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => pushPatch({ favorite: currentFavorite ? null : '1' })}
            onMouseEnter={() =>
              prefetchPatch({ favorite: currentFavorite ? null : '1' })
            }
            onFocus={() =>
              prefetchPatch({ favorite: currentFavorite ? null : '1' })
            }
            aria-pressed={currentFavorite}
            className={`${TOOL_BUTTON} ${
              currentFavorite ? 'border-chip-on-border bg-chip-on-bg font-semibold text-chip-on-fg' : ''
            }`}
          >
            <Heart
              className={`h-4 w-4 ${currentFavorite ? 'fill-heart text-heart' : ''}`}
              strokeWidth={1.8}
              aria-hidden
            />
            즐겨찾기
          </button>
          <Link
            href={`/jobs/report${searchParams.size ? `?${searchParams.toString()}` : ''}`}
            className={TOOL_BUTTON}
            title="현재 필터 그대로 취업활동 표로 이동"
          >
            <Printer className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            인쇄
          </Link>
          <AddCompanyButton companyTypes={companyTypes} />
        </div>
      </header>

      <section aria-label="필터" className="flex flex-col gap-2.5 border-y border-rule py-4">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="inline-flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border border-btn-border bg-surface px-3 text-sm text-ink-soft md:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            필터
            {chipFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-button px-1.5 text-[10px] font-medium text-white">
                {chipFilterCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-ink-muted transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        <div className={`${mobileOpen ? 'flex' : 'hidden'} flex-col gap-2.5 md:flex`}>
          <FilterGroup
            label="유형"
            trailing={
              <Link
                href="/settings/company-types"
                className="ml-auto inline-flex min-h-9 items-center gap-1 rounded px-2 text-[13px] text-ink-muted hover:text-ink"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                유형 관리
              </Link>
            }
          >
            {companyTypes.length === 0 ? (
              <Link
                href="/settings/company-types"
                className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                아직 만든 유형이 없어요 — 유형 관리에서 추가해보세요
              </Link>
            ) : (
              companyTypes.map((t) => (
                <Chip
                  key={t.key}
                  active={clientFilters.type2.has(t.key)}
                  onClick={() => toggleClient('type2', clientFilters.type2, t.key)}
                >
                  {t.label}
                </Chip>
              ))
            )}
          </FilterGroup>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <FilterGroup label="규모">
              {COMPANY_TYPE_1_VALUES.map((v) => (
                <Chip
                  key={v}
                  active={clientFilters.type1.has(v)}
                  onClick={() => toggleClient('type1', clientFilters.type1, v)}
                >
                  {COMPANY_TYPE_1_LABELS[v]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="우선순위" divided>
              {PRIORITY_VALUES.map((v) => (
                <Chip
                  key={v}
                  active={clientFilters.priority.has(v)}
                  onClick={() => toggleClient('priority', clientFilters.priority, v)}
                >
                  {PRIORITY_LABELS[v]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="채용여부" divided>
              <Chip
                active={currentHiring}
                onClick={() => pushPatch({ hiring: currentHiring ? null : '1' })}
              >
                채용중
              </Chip>
            </FilterGroup>
          </div>
          <FilterGroup label="지원상태">
            {APPLICATION_STATUS_VALUES.map((v) => (
              <Chip
                key={v}
                active={clientFilters.status.has(v)}
                onClick={() => toggleClient('status', clientFilters.status, v)}
              >
                <StatusDot status={v} />
                {APPLICATION_STATUS_LABELS[v]}
              </Chip>
            ))}
          </FilterGroup>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <span className="text-sm text-ink-soft">
            <strong className="font-semibold text-ink">{resultCount}</strong>개
          </span>
          {anyActive ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-medium text-heading hover:bg-row-hover"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              필터 초기화
            </button>
          ) : null}
          {countAside ? <div className="ml-auto">{countAside}</div> : null}
        </div>
      </section>
    </div>
  );
}

const TOOL_BUTTON =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-btn-border bg-btn-bg px-3.5 text-sm font-medium text-ink-soft hover:border-heading md:min-h-10';

// 그룹 하나: 라벨 + 칩들. 줄 맨 앞 그룹은 라벨 폭을 고정해 칩 시작선을 맞추고,
// divided(같은 줄 구분선 뒤) 그룹은 라벨을 글자 폭만큼만.
function FilterGroup({
  label,
  children,
  trailing,
  divided,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  divided?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap items-center gap-1.5 ${trailing ? 'w-full' : ''} ${divided ? 'md:border-l md:border-rule md:pl-6' : ''}`}
    >
      <span
        className={`flex-none text-[13px] font-semibold text-ink-muted ${divided ? 'pr-1.5' : 'w-16'}`}
      >
        {label}
      </span>
      {children}
      {trailing}
    </div>
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
      className={`inline-flex min-h-9 cursor-pointer items-center gap-1.75 rounded-full border px-3 text-sm transition-colors ${
        active
          ? 'border-chip-on-border bg-chip-on-bg font-semibold text-chip-on-fg'
          : 'border-btn-border bg-btn-bg text-ink-soft hover:border-heading'
      }`}
    >
      {children}
    </button>
  );
}
