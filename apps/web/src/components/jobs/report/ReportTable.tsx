import {
  APPLICATION_STATUS_LABELS,
  COMPANY_TYPE_1_LABELS,
  PRIORITY_LABELS,
  type Company,
  type CompanyType,
} from '@repo/shared';
import { AppliedAtPopover } from '../cells/AppliedAtPopover';

interface Props {
  rows: Company[];
  companyTypes: CompanyType[];
}

function formatDeadline(raw: string | null): string {
  if (!raw) return '—';
  // timestamptz 문자열 파싱 (DeadlinePopover의 로직 축약)
  let s = raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 5+컬럼 표. 인쇄 CSS가 `data-report-table`을 셀렉터로 씀.
// 지원일은 AppliedAtPopover로 인라인 편집 가능. 화면에서만 클릭 가능하고
// 인쇄물엔 텍스트만 남음 (버튼도 정적 텍스트로 렌더되므로 자연 반영).
export function ReportTable({ rows, companyTypes }: Props) {
  const type2Labels: Record<string, string> = Object.fromEntries(
    companyTypes.map((t) => [t.key, t.label]),
  );

  return (
    <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:overflow-visible sm:px-0 print:mx-0 print:overflow-visible print:px-0">
    <table
      data-report-table
      className="w-full min-w-[720px] table-fixed border-collapse text-sm text-zinc-800 sm:min-w-0 print:min-w-0 dark:text-zinc-200"
    >
      <thead>
        <tr className="border-b border-zinc-300 text-left text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          <th className="w-[11%] px-2 py-2 text-center font-medium">지원일</th>
          <th className="w-[14%] px-2 py-2 font-medium">회사명</th>
          <th className="w-[6%] px-2 py-2 text-center font-medium">유형</th>
          <th className="w-[8%] px-2 py-2 text-center font-medium">규모</th>
          <th className="w-[7%] px-2 py-2 text-center font-medium">우선순위</th>
          <th className="w-[8%] px-2 py-2 text-center font-medium">지원상태</th>
          <th className="w-[10%] px-2 py-2 text-center font-medium">마감일</th>
          <th className="px-2 py-2 font-medium">메모</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr
            key={c.id}
            className="border-b border-zinc-200 dark:border-zinc-800"
          >
            <td className="px-2 py-1.5 text-center">
              <AppliedAtPopover id={c.id} value={c.appliedAt} />
            </td>
            <td className="px-2 py-1.5 font-medium">{c.name}</td>
            <td className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
              {COMPANY_TYPE_1_LABELS[c.type1]}
            </td>
            <td className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
              {type2Labels[c.type2] ?? c.type2}
            </td>
            <td className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
              {PRIORITY_LABELS[c.priority]}
            </td>
            <td className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
              {APPLICATION_STATUS_LABELS[c.applicationStatus]}
            </td>
            <td className="px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
              {c.isRolling ? (
                <span className="inline-flex items-center whitespace-nowrap rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  상시채용
                </span>
              ) : (
                formatDeadline(c.applicationDeadline)
              )}
            </td>
            <td className="px-2 py-1.5 whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-400">
              {c.note ? c.note : <span className="text-zinc-400">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
