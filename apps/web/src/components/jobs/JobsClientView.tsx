'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type Company,
  type CompanyEvent,
  type CompanyType,
  type CompanyType1,
  type Document,
  type Priority,
} from '@repo/shared';
import { AddCompanyButton } from './AddCompanyButton';
import { CompanyDetailPanel } from './CompanyDetailPanel';
import { JobsCards } from './JobsCards';
import { JobsFilters, type JobsClientFilters } from './JobsFilters';
import { JobsTable } from './JobsTable';
import { useJobsColumns, type JobsColumns } from './useJobsColumns';

// /jobs 페이지의 클라 필터 wrapper. type1/type2/priority/status 4개는
// 이미 데이터셋(~170행)이 로컬에 와있어 서버 재필터가 낭비였음. 이 컴포넌트가
// state를 소유하고 chip 클릭은 로컬 filter 재계산 + window.history.replaceState로
// URL만 갱신 → SSR 왕복 자체가 제거돼 chip 반응이 즉각.
//
// search/favorite/hiring은 여전히 SSR 왕복 (서버가 fetch를 실제로 좁힘) — 그 부분은
// JobsFilters 안에서 router.push 그대로 유지.
export function JobsClientView({
  allRows,
  companyTypes,
  eventsByCompany,
  documents,
  highlightId,
}: {
  allRows: Company[];
  companyTypes: CompanyType[];
  eventsByCompany: Map<string, CompanyEvent[]>;
  documents: Document[];
  highlightId?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [columns, setColumns] = useJobsColumns();
  // '간단히' 보기에서 사이드 패널로 연 회사.
  const [detailId, setDetailId] = useState<string | null>(null);

  const [type1Set, setType1Set] = useState<ReadonlySet<CompanyType1>>(() =>
    parseEnumSet(searchParams.get('type1'), COMPANY_TYPE_1_VALUES),
  );
  const [type2Set, setType2Set] = useState<ReadonlySet<string>>(() =>
    parseCsvSet(searchParams.get('type2')),
  );
  const [prioritySet, setPrioritySet] = useState<ReadonlySet<Priority>>(() =>
    parseEnumSet(searchParams.get('priority'), PRIORITY_VALUES),
  );
  const [statusSet, setStatusSet] = useState<ReadonlySet<ApplicationStatus>>(
    () => parseEnumSet(searchParams.get('status'), APPLICATION_STATUS_VALUES),
  );

  // External URL change (browser back, external nav) → resync. Internal
  // updates go through window.history.replaceState which does NOT re-trigger
  // Next router state, so no ping-pong. Render-phase diff pattern (React 공식):
  // searchParams identity 변경을 감지해 render 중 setState — useEffect 쓰면
  // react-hooks/set-state-in-effect 룰에 걸림.
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
  if (searchParams !== prevSearchParams) {
    setPrevSearchParams(searchParams);
    setType1Set(parseEnumSet(searchParams.get('type1'), COMPANY_TYPE_1_VALUES));
    setType2Set(parseCsvSet(searchParams.get('type2')));
    setPrioritySet(parseEnumSet(searchParams.get('priority'), PRIORITY_VALUES));
    setStatusSet(
      parseEnumSet(searchParams.get('status'), APPLICATION_STATUS_VALUES),
    );
  }

  const clientFilters: JobsClientFilters = {
    type1: type1Set,
    type2: type2Set,
    priority: prioritySet,
    status: statusSet,
  };

  function replaceParams(
    updater: (params: URLSearchParams) => void,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    const url = params.toString() ? `${pathname}?${params}` : pathname;
    // history.replaceState는 Next.js router state를 재트리거하지 않아 SSR을
    // 안 태우면서 URL bar와 공유 링크만 최신화. 위 useEffect도 안 재발화.
    window.history.replaceState(null, '', url);
  }

  function handleClientFilterChange<K extends keyof JobsClientFilters>(
    key: K,
    next: JobsClientFilters[K],
  ) {
    switch (key) {
      case 'type1':
        setType1Set(next as ReadonlySet<CompanyType1>);
        break;
      case 'type2':
        setType2Set(next as ReadonlySet<string>);
        break;
      case 'priority':
        setPrioritySet(next as ReadonlySet<Priority>);
        break;
      case 'status':
        setStatusSet(next as ReadonlySet<ApplicationStatus>);
        break;
    }
    replaceParams((params) => {
      if (next.size) {
        params.set(key, Array.from(next).join(','));
      } else {
        params.delete(key);
      }
    });
  }

  function handleClientClearAll() {
    setType1Set(new Set());
    setType2Set(new Set());
    setPrioritySet(new Set());
    setStatusSet(new Set());
    // URL side (favorite/hiring/q/etc) 초기화는 JobsFilters의 clearAll이 router.push('/jobs')로
    // 처리. 여기선 client filter만 리셋.
  }

  const filteredRows = useMemo(() => {
    if (
      type1Set.size === 0 &&
      type2Set.size === 0 &&
      prioritySet.size === 0 &&
      statusSet.size === 0
    ) {
      return allRows;
    }
    return allRows.filter((c) => {
      if (type1Set.size && !type1Set.has(c.type1)) return false;
      if (type2Set.size && !type2Set.has(c.type2)) return false;
      if (prioritySet.size && !prioritySet.has(c.priority)) return false;
      if (statusSet.size && !statusSet.has(c.applicationStatus)) return false;
      return true;
    });
  }, [allRows, type1Set, type2Set, prioritySet, statusSet]);

  // 필터로 목록에서 빠지거나 삭제되면 패널도 닫힘(찾을 수 없으면 null).
  const detailCompany = detailId ? (filteredRows.find((c) => c.id === detailId) ?? null) : null;

  const hasAnyFilter =
    type1Set.size > 0 ||
    type2Set.size > 0 ||
    prioritySet.size > 0 ||
    statusSet.size > 0 ||
    searchParams.get('favorite') === '1' ||
    searchParams.get('hiring') === '1' ||
    !!searchParams.get('q');

  return (
    <>
      <JobsFilters
        companyTypes={companyTypes}
        clientFilters={clientFilters}
        onClientFilterChange={handleClientFilterChange}
        onClientClearAll={handleClientClearAll}
        resultCount={filteredRows.length}
        countAside={<ColumnsToggle value={columns} onChange={setColumns} />}
      />
      {filteredRows.length === 0 ? (
        // docs/design/rally-jobs-parts.html 빈 상태 2종
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-btn-border bg-surface px-6 py-12 text-center">
          <p className="text-[15px] text-ink-soft">
            {hasAnyFilter
              ? '조건에 맞는 회사가 없어요. 필터를 조금 풀어보세요.'
              : '아직 등록한 회사가 없어요. [+ 추가하기] 버튼을 눌러 첫 회사를 담아보세요.'}
          </p>
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={() => {
                handleClientClearAll();
                router.push('/jobs');
              }}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-btn-border bg-btn-bg px-4 text-sm font-medium text-heading hover:border-heading"
            >
              필터 초기화
            </button>
          ) : (
            <AddCompanyButton companyTypes={companyTypes} />
          )}
        </div>
      ) : (
        <>
          <JobsTable
            rows={filteredRows}
            companyTypes={companyTypes}
            eventsByCompany={eventsByCompany}
            documents={documents}
            highlightId={highlightId}
            detailId={detailId}
            onOpenDetail={setDetailId}
          />
          <JobsCards
            rows={filteredRows}
            companyTypes={companyTypes}
            eventsByCompany={eventsByCompany}
            documents={documents}
            highlightId={highlightId}
          />
        </>
      )}
      {detailCompany && columns === 'compact' ? (
        <CompanyDetailPanel
          key={detailCompany.id}
          company={detailCompany}
          events={eventsByCompany.get(detailCompany.id) ?? []}
          documents={documents}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </>
  );
}

// "N개" 줄 오른쪽 열 보기 전환 (데스크톱 표에만 의미 있어서 md 이상).
function ColumnsToggle({
  value,
  onChange,
}: {
  value: JobsColumns;
  onChange: (next: JobsColumns) => void;
}) {
  // 눌림 색은 <html data-jobs-columns> 기준 CSS — 새로고침 직후에도 맞게.
  const options: { value: JobsColumns; label: string; on: string; off: string }[] = [
    {
      value: 'compact',
      label: '간단히',
      on: '[[data-jobs-columns=compact]_&]:bg-chip-on-bg [[data-jobs-columns=compact]_&]:font-semibold [[data-jobs-columns=compact]_&]:text-chip-on-fg',
      off: '',
    },
    {
      value: 'full',
      label: '자세히',
      on: 'bg-chip-on-bg font-semibold text-chip-on-fg',
      off: '[[data-jobs-columns=compact]_&]:bg-btn-bg [[data-jobs-columns=compact]_&]:font-normal [[data-jobs-columns=compact]_&]:text-ink-soft',
    },
  ];
  return (
    <div
      role="group"
      aria-label="열 보기"
      className="hidden overflow-hidden rounded-md border border-btn-border md:inline-flex"
    >
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`min-h-9 cursor-pointer bg-btn-bg px-3 text-[13px] text-ink-soft hover:text-ink ${i > 0 ? 'border-l border-btn-border' : ''} ${o.on} ${o.off}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function parseCsvSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

function parseEnumSet<T extends string>(
  raw: string | null,
  values: readonly T[],
): Set<T> {
  if (!raw) return new Set();
  const allowed = new Set(values as readonly string[]);
  const picked = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => allowed.has(s)) as T[];
  return new Set(picked);
}
