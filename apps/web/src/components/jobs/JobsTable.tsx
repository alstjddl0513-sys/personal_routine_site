'use client';

import {
  type Company,
  type CompanyEvent,
  type CompanyType,
} from '@repo/shared';
import { PrioritySelect } from './cells/PrioritySelect';
import { StatusSelect } from './cells/StatusSelect';
import { HiringToggle } from './cells/HiringToggle';
import { NotePopover } from './cells/NotePopover';
import { UrlPopover } from './cells/UrlPopover';
import { TypeSelect } from './cells/TypeSelect';
import { SizeSelect } from './cells/SizeSelect';
import { DeadlinePopover } from './cells/DeadlinePopover';
import { EventsPopover } from './cells/EventsPopover';
import { FavoriteToggle } from './cells/FavoriteToggle';
import { DeleteRowButton } from './cells/DeleteRowButton';

export function JobsTable({
  rows,
  companyTypes,
  eventsByCompany,
  highlightId,
}: {
  rows: Company[];
  companyTypes: CompanyType[];
  eventsByCompany: Map<string, CompanyEvent[]>;
  highlightId?: string;
}) {
  return (
    <div className="hidden rounded-md border border-zinc-200 md:block dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          <tr>
            <Th className="w-8 px-1" srOnly>
              즐겨찾기
            </Th>
            <Th align="left" className="pl-1 pr-2">
              회사명
            </Th>
            <Th className="px-2">유형</Th>
            <Th className="px-2">규모</Th>
            <Th className="px-2">우선순위</Th>
            <Th className="px-2">채용중</Th>
            <Th className="px-2">지원상태</Th>
            <Th>마감일</Th>
            <Th className="px-2">일정</Th>
            <Th className="px-2">공고 링크</Th>
            <Th>메모</Th>
            <Th className="w-8 px-1" srOnly>
              액션
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((c) => (
            <tr
              key={c.id}
              data-cid={c.id}
              className={`group hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 ${
                c.id === highlightId
                  ? 'animate-[highlight-flash_2.5s_ease-out]'
                  : ''
              }`}
            >
              <Td className="w-8 px-1">
                <Center>
                  <FavoriteToggle id={c.id} value={c.isFavorite} />
                </Center>
              </Td>
              <Td className="w-1 pl-1 pr-2 font-medium whitespace-nowrap">
                {c.name}
              </Td>
              <Td className="px-2">
                <Center>
                  <TypeSelect id={c.id} value={c.type2} types={companyTypes} />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <SizeSelect id={c.id} value={c.type1} />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <PrioritySelect id={c.id} value={c.priority} />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <HiringToggle id={c.id} value={c.isHiring} />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <StatusSelect id={c.id} value={c.applicationStatus} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <DeadlinePopover id={c.id} value={c.applicationDeadline} isRolling={c.isRolling} />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <EventsPopover
                    companyId={c.id}
                    events={eventsByCompany.get(c.id) ?? []}
                  />
                </Center>
              </Td>
              <Td className="px-2">
                <Center>
                  <UrlPopover id={c.id} value={c.postingUrl} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <NotePopover id={c.id} value={c.note} />
                </Center>
              </Td>
              <Td className="w-8 px-1">
                <Center>
                  <DeleteRowButton id={c.id} name={c.name} />
                </Center>
              </Td>
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
  // 패딩은 caller가 지정 (중간 pill 열은 px-2, 가장자리/텍스트 열은 px-3 등 유연하게).
  return (
    <th className={`py-2 font-medium ${alignClass} ${className ?? 'px-3'}`}>
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-2 align-middle ${className ?? 'px-3'}`}>{children}</td>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center">{children}</div>;
}
