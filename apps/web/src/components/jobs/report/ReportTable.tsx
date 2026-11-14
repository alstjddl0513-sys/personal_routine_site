import {
  APPLICATION_STATUS_LABELS,
  COMPANY_TYPE_1_LABELS,
  PRIORITY_LABELS,
  type ApplicationStatus,
  type Company,
  type CompanyType,
} from '@repo/shared';
import { AppliedAtPopover } from '../cells/AppliedAtPopover';
import { StatusBadge } from '../../settings/lists/ListCard';

interface Props {
  rows: Company[];
  companyTypes: CompanyType[];
}

function formatDeadline(raw: string | null): string {
  if (!raw) return '—';
  // timestamptz 문자열 파싱 (DeadlinePopover의 로직 축약)
  const s = raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  // 머리의 기간("2026.11.13")과 같은 점 표기
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

// 지원상태 점 — 통과(합격)는 primary, 지원은 ink-muted, 탈락 · 지원취소 · 미지원은 ink-faint.
// 인쇄본엔 점 없이 글자만(흑백에서 점이 다 같아 보임).
function statusDot(s: ApplicationStatus): string {
  if (s === 'applied') return 'bg-ink-muted';
  if (s.endsWith('_passed')) return 'bg-primary';
  return 'bg-ink-faint';
}

const TH = 'h-10 px-2 align-middle text-[13px] font-semibold text-ink-soft';
const TD = 'px-2 py-2.5 align-top';

// 취업활동 표 (docs/design/rally-jobs-report*.html). 인쇄 CSS가 `data-report-table`을 셀렉터로 씀.
// 인쇄 때 표 머리가 쪽마다 반복되고 칸 선이 그어지도록 진짜 <table> + colgroup(시안은 CSS grid).
// 지원일은 AppliedAtPopover로 그 자리 편집 — 인쇄물엔 글자만 남음.
export function ReportTable({ rows, companyTypes }: Props) {
  const type2Labels: Record<string, string> = Object.fromEntries(
    companyTypes.map((t) => [t.key, t.label]),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface print:overflow-visible print:rounded-none print:border-0">
      <table data-report-table className="w-full min-w-215 table-fixed border-collapse text-sm text-ink print:min-w-0">
        <colgroup>
          <col className="w-38" />
          <col className="w-[22%]" />
          <col className="w-19" />
          <col className="w-18" />
          <col className="w-17" />
          <col className="w-21" />
          <col className="w-26" />
          <col />
        </colgroup>
        <thead className="border-b border-divider bg-thead">
          <tr className="whitespace-nowrap">
            <th scope="col" className={`${TH} pl-4 text-center`}>지원일</th>
            <th scope="col" className={`${TH} text-left`}>회사명</th>
            <th scope="col" className={`${TH} text-center`}>유형</th>
            <th scope="col" className={`${TH} text-center`}>규모</th>
            <th scope="col" className={`${TH} text-center`}>우선순위</th>
            <th scope="col" className={`${TH} text-left`}>지원상태</th>
            <th scope="col" className={`${TH} text-center`}>마감일</th>
            <th scope="col" className={`${TH} pr-4 text-left`}>메모</th>
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-divider [&>tr:last-child]:border-b-0">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-row-hover">
              <td className={`${TD} pl-4 text-center`}>
                <AppliedAtPopover id={c.id} value={c.appliedAt} />
              </td>
              <td className={`${TD} font-semibold text-ink-strong`}>{c.name}</td>
              {/* 유형 = type2(서비스 · SI …, 설정에서 고치는 것), 규모 = type1(대기업 · 중소 …) — 채용 리스트와 같게 */}
              <td className={`${TD} text-center`}>{type2Labels[c.type2] ?? c.type2}</td>
              <td className={`${TD} text-center`}>{COMPANY_TYPE_1_LABELS[c.type1]}</td>
              <td className={`${TD} text-center`}>{PRIORITY_LABELS[c.priority]}</td>
              <td className={TD}>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full print:hidden ${statusDot(c.applicationStatus)}`} />
                  {APPLICATION_STATUS_LABELS[c.applicationStatus]}
                </span>
              </td>
              <td className={`${TD} text-center whitespace-nowrap`}>
                {c.isRolling ? <StatusBadge>상시채용</StatusBadge> : formatDeadline(c.applicationDeadline)}
              </td>
              <td data-report-memo className={`${TD} pr-4 whitespace-pre-line wrap-break-word text-ink-soft`}>
                {c.note ? c.note : <span className="text-icon-faint">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
