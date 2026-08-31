import { type Company } from '@repo/shared';
import { PrioritySelect } from './cells/PrioritySelect';
import { StatusSelect } from './cells/StatusSelect';
import { HiringToggle } from './cells/HiringToggle';
import { NotePopover } from './cells/NotePopover';
import { UrlPopover } from './cells/UrlPopover';
import { TypeSelect } from './cells/TypeSelect';
import { SizeSelect } from './cells/SizeSelect';
import { DeadlinePopover } from './cells/DeadlinePopover';
import { FavoriteToggle } from './cells/FavoriteToggle';
import { DeleteRowButton } from './cells/DeleteRowButton';

export function JobsTable({ rows }: { rows: Company[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
        조건에 맞는 회사가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          <tr>
            <Th className="w-8" srOnly>
              즐겨찾기
            </Th>
            <Th align="left" className="pr-1">
              회사명
            </Th>
            <Th>유형</Th>
            <Th>규모</Th>
            <Th>우선순위</Th>
            <Th>채용중</Th>
            <Th>지원상태</Th>
            <Th>마감일</Th>
            <Th className="pr-0">공고 링크</Th>
            <Th className="pl-0">메모</Th>
            <Th className="w-8" srOnly>
              액션
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((c) => (
            <tr
              key={c.id}
              className="group hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30"
            >
              <Td>
                <Center>
                  <FavoriteToggle id={c.id} value={c.isFavorite} />
                </Center>
              </Td>
              <Td className="w-1 pr-1 font-medium whitespace-nowrap">
                {c.name}
              </Td>
              <Td>
                <Center>
                  <TypeSelect id={c.id} value={c.type2} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <SizeSelect id={c.id} value={c.type1} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <PrioritySelect id={c.id} value={c.priority} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <HiringToggle id={c.id} value={c.isHiring} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <StatusSelect id={c.id} value={c.applicationStatus} />
                </Center>
              </Td>
              <Td>
                <Center>
                  <DeadlinePopover id={c.id} value={c.applicationDeadline} />
                </Center>
              </Td>
              <Td className="pr-0">
                <Center>
                  <UrlPopover id={c.id} value={c.postingUrl} />
                </Center>
              </Td>
              <Td className="pl-0">
                <Center>
                  <NotePopover id={c.id} value={c.note} />
                </Center>
              </Td>
              <Td>
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
  return (
    <th className={`px-3 py-2 font-medium ${alignClass} ${className ?? ''}`}>
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
    <td className={`px-3 py-2 align-middle ${className ?? ''}`}>{children}</td>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center">{children}</div>;
}
