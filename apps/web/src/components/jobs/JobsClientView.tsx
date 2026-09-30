'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type Company,
  type CompanyType,
  type CompanyType1,
  type Priority,
} from '@repo/shared';
import { JobsCards } from './JobsCards';
import { JobsFilters, type JobsClientFilters } from './JobsFilters';
import { JobsTable } from './JobsTable';

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
  highlightId,
}: {
  allRows: Company[];
  companyTypes: CompanyType[];
  highlightId?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
  // Next router state, so no ping-pong with the effect above.
  useEffect(() => {
    setType1Set(parseEnumSet(searchParams.get('type1'), COMPANY_TYPE_1_VALUES));
    setType2Set(parseCsvSet(searchParams.get('type2')));
    setPrioritySet(parseEnumSet(searchParams.get('priority'), PRIORITY_VALUES));
    setStatusSet(
      parseEnumSet(searchParams.get('status'), APPLICATION_STATUS_VALUES),
    );
  }, [searchParams]);

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
      <div className="-mt-2 flex justify-end text-xs text-zinc-500">
        {filteredRows.length}개
      </div>
      <JobsFilters
        companyTypes={companyTypes}
        clientFilters={clientFilters}
        onClientFilterChange={handleClientFilterChange}
        onClientClearAll={handleClientClearAll}
      />
      {filteredRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {hasAnyFilter
            ? '조건에 맞는 회사가 없어요. 필터를 조금 풀어보세요.'
            : '아직 등록한 회사가 없어요. 위 [+ 추가하기] 버튼을 눌러 첫 회사를 담아보세요.'}
        </div>
      ) : (
        <>
          <JobsTable
            rows={filteredRows}
            companyTypes={companyTypes}
            highlightId={highlightId}
          />
          <JobsCards
            rows={filteredRows}
            companyTypes={companyTypes}
            highlightId={highlightId}
          />
        </>
      )}
    </>
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
