import type { ApplicationStatus } from '@repo/shared';
import { computeKpi, computeUpcomingDeadlines } from '../../lib/jobs-stats';
import { getToday, loadCompanies, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, ProgressBar, TodayCard } from './Card';

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
      <TodayCard id="jobs-title" title="채용 현황" className="flex-[1_1_320px]">
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      </TodayCard>
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
    <TodayCard
      id="jobs-title"
      title="채용 현황"
      className="flex-[1_1_320px]"
      aside={<CardLink href="/jobs">리스트 →</CardLink>}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="지원" value={applied} />
        <Stat label="서류 합격" value={docPassed} />
        <Stat label="면접 진행" value={interviewing} />
        <Stat label="D-7 임박" value={upcoming} tone="alert" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-ink-muted">
          <span>
            서류 통과율
            <span className="ml-1 text-ink-faint">· 결과 나온 {decided}곳 기준</span>
          </span>
          <span className="font-display font-semibold text-ink">
            {passRate === null ? '—' : `${passRate}%`}
          </span>
        </div>
        <ProgressBar pct={passRate ?? 0} className="h-2" />
      </div>
    </TodayCard>
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
    <div
      className={`flex flex-col rounded-[14px] p-3.5 ${
        alert ? 'bg-deadline-bg text-deadline-fg' : 'bg-surface-muted'
      }`}
    >
      <span className={`text-xs ${alert ? '' : 'text-ink-muted'}`}>{label}</span>
      <span
        className={`font-display text-[28px] leading-[1.2] font-extrabold ${
          alert ? '' : 'text-ink'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
