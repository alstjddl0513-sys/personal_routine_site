import { Heart } from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_2_LABELS,
  PRIORITY_LABELS,
  type Company,
} from '@repo/shared';

const PRIORITY_STYLE: Record<Company['priority'], string> = {
  urgent:
    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  important:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  normal: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export function JobsTable({ rows }: { rows: Company[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
        조건에 맞는 회사가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          <tr>
            <Th className="w-8" srOnly>
              즐겨찾기
            </Th>
            <Th>회사명</Th>
            <Th>유형</Th>
            <Th>규모</Th>
            <Th>우선순위</Th>
            <Th>채용중</Th>
            <Th>지원상태</Th>
            <Th>마감</Th>
            <Th>공고</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((c) => (
            <tr
              key={c.id}
              className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30"
            >
              <Td>
                {c.isFavorite ? (
                  <Heart
                    className="h-4 w-4 fill-rose-500 text-rose-500"
                    aria-label="즐겨찾기"
                  />
                ) : null}
              </Td>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-zinc-600 dark:text-zinc-400">
                {COMPANY_TYPE_2_LABELS[c.type2]}
              </Td>
              <Td className="text-zinc-600 dark:text-zinc-400">
                {COMPANY_TYPE_1_LABELS[c.type1]}
              </Td>
              <Td>
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs ${PRIORITY_STYLE[c.priority]}`}
                >
                  {PRIORITY_LABELS[c.priority]}
                </span>
              </Td>
              <Td>
                {c.isHiring ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                )}
              </Td>
              <Td className="text-zinc-600 dark:text-zinc-400">
                {APPLICATION_STATUS_LABELS[c.applicationStatus]}
              </Td>
              <Td className="text-zinc-500">
                {c.applicationDeadline ?? '—'}
              </Td>
              <Td>
                {c.postingUrl ? (
                  <a
                    href={c.postingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    링크
                  </a>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
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
}: {
  children: React.ReactNode;
  className?: string;
  srOnly?: boolean;
}) {
  return (
    <th className={`px-3 py-2 font-medium ${className ?? ''}`}>
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
  return <td className={`px-3 py-2 align-middle ${className ?? ''}`}>{children}</td>;
}
