'use client';

import {
  type Company,
  type CompanyEvent,
  type CompanyType,
  type Document,
} from '@repo/shared';
import { PrioritySelect } from './cells/PrioritySelect';
import { StatusSelect } from './cells/StatusSelect';
import { HiringToggle } from './cells/HiringToggle';
import { NotePopover } from './cells/NotePopover';
import { UrlPopover } from './cells/UrlPopover';
import { SubmittedDocsPopover } from './cells/SubmittedDocsPopover';
import { TypeSelect } from './cells/TypeSelect';
import { SizeSelect } from './cells/SizeSelect';
import { DeadlinePopover } from './cells/DeadlinePopover';
import { EventsPopover } from './cells/EventsPopover';
import { FavoriteToggle } from './cells/FavoriteToggle';
import { DeleteRowButton } from './cells/DeleteRowButton';

// 데스크톱 표 (docs/design/rally-jobs.html). 셀은 평소엔 글자처럼 보이고 행
// hover 때 ▾·삭제가 나타남 — 각 셀은 variant="table". 모바일은 JobsCards.
// 열: ♡ | 회사(+유형·규모) | 우선순위 | 채용여부 | 지원상태 | 마감일 | 일정·공고·제출본·메모 | 삭제

// 회사 열은 26%로 묶어 남는 가로 공간이 회사 열에만 몰리지 않게(다른 열 사이로
// 고르게 나뉨). 보조 4열(아이콘)은 고정 폭.
const AUX_COL = 'w-13 px-1';

export function JobsTable({
  rows,
  companyTypes,
  eventsByCompany,
  documents,
  highlightId,
}: {
  rows: Company[];
  companyTypes: CompanyType[];
  eventsByCompany: Map<string, CompanyEvent[]>;
  documents: Document[];
  highlightId?: string;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
      <table className="w-full min-w-235 border-collapse text-sm">
        <thead className="border-b border-line bg-thead text-[13px] text-ink-muted">
          <tr>
            <Th className="w-11 px-0" srOnly>
              즐겨찾기
            </Th>
            <Th align="left" className="w-[26%] min-w-48 px-2">
              회사 <span className="font-normal">· 유형 · 규모</span>
            </Th>
            <Th className="w-18 px-2">우선순위</Th>
            <Th className="w-18 px-2">채용여부</Th>
            <Th className="w-32 px-2 text-ink-soft">지원상태</Th>
            <Th className="w-38 px-2 text-ink-soft">마감일</Th>
            <Th className={`${AUX_COL} border-l border-divider text-xs font-medium`}>일정</Th>
            <Th className={`${AUX_COL} text-xs font-medium`}>공고</Th>
            <Th className={`${AUX_COL} text-xs font-medium`}>제출본</Th>
            <Th className={`${AUX_COL} text-xs font-medium`}>메모</Th>
            <Th className="w-11 px-0" srOnly>
              삭제
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              data-cid={c.id}
              className={`group border-b border-divider last:border-b-0 hover:bg-row-hover ${
                c.id === highlightId ? 'animate-[row-flash_2.5s_ease-out]' : ''
              }`}
            >
              <td className="px-0 text-center">
                <FavoriteToggle id={c.id} value={c.isFavorite} variant="table" />
              </td>
              <td className="px-2 py-2.5">
                <div className="flex flex-col gap-px">
                  <span className="text-[15px] font-semibold text-ink">{c.name}</span>
                  <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                    <TypeSelect id={c.id} value={c.type2} types={companyTypes} variant="table" />
                    <span aria-hidden>·</span>
                    <SizeSelect id={c.id} value={c.type1} variant="table" />
                  </span>
                </div>
              </td>
              <td className="px-1 text-center">
                <PrioritySelect id={c.id} value={c.priority} variant="table" />
              </td>
              <td className="px-1 text-center">
                <HiringToggle id={c.id} value={c.isHiring} variant="table" />
              </td>
              <td className="px-1 text-center">
                <StatusSelect id={c.id} value={c.applicationStatus} variant="table" />
              </td>
              <td className="px-1 text-center">
                <DeadlinePopover
                  id={c.id}
                  value={c.applicationDeadline}
                  isRolling={c.isRolling}
                  status={c.applicationStatus}
                  variant="table"
                />
              </td>
              <td className="border-l border-divider px-0 text-center">
                <EventsPopover
                  companyId={c.id}
                  companyName={c.name}
                  events={eventsByCompany.get(c.id) ?? []}
                  variant="table"
                />
              </td>
              <td className="px-0 text-center">
                <UrlPopover id={c.id} value={c.postingUrl} variant="table" />
              </td>
              <td className="px-0 text-center">
                <SubmittedDocsPopover
                  id={c.id}
                  resumeDocumentId={c.resumeDocumentId}
                  portfolioDocumentId={c.portfolioDocumentId}
                  documents={documents}
                  variant="table"
                />
              </td>
              <td className="px-0 text-center">
                <NotePopover id={c.id} value={c.note} variant="table" />
              </td>
              <td className="px-0 text-center">
                <DeleteRowButton id={c.id} name={c.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
  srOnly,
  align = 'center',
}: {
  children: React.ReactNode;
  className?: string;
  srOnly?: boolean;
  align?: 'left' | 'center';
}) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  return (
    <th scope="col" className={`py-3 font-semibold ${alignClass} ${className ?? 'px-3'}`}>
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}
