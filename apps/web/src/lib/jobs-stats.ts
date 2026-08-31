import {
  COMPANY_TYPE_1_VALUES,
  COMPANY_TYPE_2_VALUES,
  type ApplicationStatus,
  type Company,
  type CompanyType1,
  type CompanyType2,
} from '@repo/shared';

export interface KpiSummary {
  total: number;
  hiring: number;
  applied: number;
  favorite: number;
}

export function computeKpi(rows: Company[]): KpiSummary {
  let hiring = 0;
  let applied = 0;
  let favorite = 0;
  for (const c of rows) {
    if (c.isHiring) hiring += 1;
    if (c.applicationStatus !== 'not_applied') applied += 1;
    if (c.isFavorite) favorite += 1;
  }
  return { total: rows.length, hiring, applied, favorite };
}

// Pipeline stages: collapse the fail states into a single "탈락" bucket so
// the shape stays readable (11 statuses is too many bars).
export const PIPELINE_STAGES = [
  { key: 'not_applied', label: '미지원' },
  { key: 'applied', label: '지원' },
  { key: 'document_passed', label: '서류합격' },
  { key: 'interview_1_passed', label: '1차합격' },
  { key: 'interview_2_passed', label: '2차합격' },
  { key: 'final_passed', label: '최종합격' },
  { key: 'failed', label: '탈락' },
  { key: 'withdrawn', label: '지원취소' },
] as const;

export type PipelineKey = (typeof PIPELINE_STAGES)[number]['key'];

const FAILED_STATUSES: readonly ApplicationStatus[] = [
  'document_failed',
  'interview_1_failed',
  'interview_2_failed',
  'final_failed',
];

export function computePipeline(rows: Company[]): Record<PipelineKey, number> {
  const counts: Record<PipelineKey, number> = {
    not_applied: 0,
    applied: 0,
    document_passed: 0,
    interview_1_passed: 0,
    interview_2_passed: 0,
    final_passed: 0,
    failed: 0,
    withdrawn: 0,
  };
  for (const c of rows) {
    const s = c.applicationStatus;
    if (FAILED_STATUSES.includes(s)) counts.failed += 1;
    else counts[s as PipelineKey] += 1;
  }
  return counts;
}

export function computeType1Distribution(
  rows: Company[],
): Record<CompanyType1, number> {
  const counts = Object.fromEntries(
    COMPANY_TYPE_1_VALUES.map((v) => [v, 0]),
  ) as Record<CompanyType1, number>;
  for (const c of rows) counts[c.type1] += 1;
  return counts;
}

export function computeType2Distribution(
  rows: Company[],
): Record<CompanyType2, number> {
  const counts = Object.fromEntries(
    COMPANY_TYPE_2_VALUES.map((v) => [v, 0]),
  ) as Record<CompanyType2, number>;
  for (const c of rows) counts[c.type2] += 1;
  return counts;
}

export interface UpcomingDeadline {
  id: string;
  name: string;
  deadline: string;
  daysLeft: number;
  postingUrl: string | null;
  applicationStatus: ApplicationStatus;
}

// Statuses that are still "in flight" — the deadline is actionable.
// Excludes final outcomes (합격/탈락/철회) since there's nothing more to do
// before the deadline for those.
const ACTIVE_STATUSES: readonly ApplicationStatus[] = [
  'not_applied',
  'applied',
  'document_passed',
  'interview_1_passed',
  'interview_2_passed',
];

// Calendar-day diff in local time. Ignores hours/minutes so
// "same day" is D-0 regardless of whether it's 9am or 11pm.
function daysUntil(deadlineIso: string, now: Date): number {
  const dl = new Date(deadlineIso);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate()).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function computeUpcomingDeadlines(
  rows: Company[],
  now: Date = new Date(),
  windowDays = 7,
): UpcomingDeadline[] {
  const items: UpcomingDeadline[] = [];
  for (const c of rows) {
    if (!c.applicationDeadline) continue;
    if (!c.isHiring) continue;
    if (!ACTIVE_STATUSES.includes(c.applicationStatus)) continue;
    const daysLeft = daysUntil(c.applicationDeadline, now);
    if (daysLeft < 0 || daysLeft > windowDays) continue;
    items.push({
      id: c.id,
      name: c.name,
      deadline: c.applicationDeadline,
      daysLeft,
      postingUrl: c.postingUrl,
      applicationStatus: c.applicationStatus,
    });
  }
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  return items;
}
