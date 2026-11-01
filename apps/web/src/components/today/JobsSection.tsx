import type { ApplicationStatus } from '@repo/shared';
import { computeKpi, computeUpcomingDeadlines } from '../../lib/jobs-stats';
import { getToday, loadCompanies, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, TodayPanel } from './Card';

// 서류를 통과한 적이 있는 상태 전부 — 이후 면접에서 떨어져도 서류는 통과.
// (computePipeline은 탈락을 한 버킷으로 합쳐서 '서류 통과' 집계엔 못 씀)
const DOC_PASSED: readonly ApplicationStatus[] = [
  'document_passed',
  'interview_1_passed',
  'interview_1_failed',
  'interview_2_passed',
  'interview_2_failed',
  'final_passed',
  'final_failed',
];
// 지금 면접 단계를 밟고 있는 곳 (1·2차 합격 후 다음 면접 대기).
const IN_INTERVIEW: readonly ApplicationStatus[] = [
  'interview_1_passed',
  'interview_2_passed',
];

export async function JobsSection() {
  const { today } = getToday();
  const rows = await settle(loadCompanies());

  if (!rows) {
    return (
      <TodayPanel id="jobs-title" title="채용 현황">
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      </TodayPanel>
    );
  }

  const { applied } = computeKpi(rows);
  const docPassed = rows.filter((c) => DOC_PASSED.includes(c.applicationStatus)).length;
  const docFailed = rows.filter((c) => c.applicationStatus === 'document_failed').length;
  const interviewing = rows.filter((c) => IN_INTERVIEW.includes(c.applicationStatus)).length;
  const upcoming = computeUpcomingDeadlines(rows, today, 7).length;
  // 통과율 분모는 '서류 결과가 나온 곳'만 — 결과 대기 중인 지원까지 넣으면
  // 라벨(통과율)과 측정이 어긋남.
  const decided = docPassed + docFailed;
  const passRate = decided > 0 ? Math.round((docPassed / decided) * 100) : null;

  return (
    <TodayPanel
      id="jobs-title"
      title="채용 현황"
      aside={<CardLink href="/jobs">채용 리스트</CardLink>}
    >
      <dl className="grid grid-cols-4">
        <Stat label="지원" value={applied} />
        <Stat label="서류 합격" value={docPassed} />
        <Stat label="면접 중" value={interviewing} />
        <Stat label="7일 내 마감" value={upcoming} tone="alert" />
      </dl>
      <p className="text-sm text-ink-soft">
        서류 통과율{' '}
        <strong className="font-semibold text-ink-strong">
          {passRate === null ? '—' : `${passRate}%`}
        </strong>
        {decided > 0 ? ` · 결과 나온 ${decided}곳 중 ${docPassed}곳` : ' · 아직 결과 나온 곳이 없어요'}
      </p>
    </TodayPanel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'alert';
}) {
  const alert = tone === 'alert' && value > 0;
  return (
    <div className="border-l border-rule px-3 first:border-l-0 first:pl-0 last:pr-0">
      <dt className={`text-[13px] ${alert ? 'text-alert' : 'text-ink-muted'}`}>{label}</dt>
      <dd className={`mt-0.5 text-2xl leading-[1.2] font-semibold ${alert ? 'text-alert' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
