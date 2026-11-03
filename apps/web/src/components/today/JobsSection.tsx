import {
  INTERVIEW_STAGE_HINT,
  computeJobsSummary,
  computeUpcomingDeadlines,
} from '../../lib/jobs-stats';
import { getToday, loadCompanies, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, TodayPanel } from './Card';

// 숫자 정의는 기업 통계와 같은 computeJobsSummary (lib/jobs-stats.ts).
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

  const {
    applied,
    documentPassed: docPassed,
    documentFailed,
    documentPassRate: passRate,
    interviewing,
  } = computeJobsSummary(rows);
  const upcoming = computeUpcomingDeadlines(rows, today, 7).length;
  // 통과율 분모는 '서류 결과가 나온 곳'만 — 결과 대기 중인 지원까지 넣으면
  // 라벨(통과율)과 측정이 어긋남.
  const decided = docPassed + documentFailed;

  return (
    <TodayPanel
      id="jobs-title"
      title="채용 현황"
      aside={<CardLink href="/jobs">채용 리스트</CardLink>}
    >
      <dl className="grid grid-cols-4">
        <Stat label="지원" value={applied} />
        <Stat label="서류 합격" value={docPassed} />
        <Stat label="면접 단계" value={interviewing} title={INTERVIEW_STAGE_HINT} />
        <Stat label="7일 내 마감" value={upcoming} tone="alert" />
      </dl>
      <p className="text-sm text-ink-soft">
        서류 통과율{' '}
        <strong className="font-semibold text-ink-strong">
          {passRate === null ? '—' : `${passRate}%`}
        </strong>
        {decided > 0 ? ` · ${decided}곳 중 ${docPassed}곳 통과` : ' · 아직 서류 결과가 없어요'}
      </p>
    </TodayPanel>
  );
}

function Stat({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: number;
  tone?: 'alert';
  /** 라벨이 묶는 상태 (툴팁). */
  title?: string;
}) {
  const alert = tone === 'alert' && value > 0;
  return (
    <div className="border-l border-rule px-3 first:border-l-0 first:pl-0 last:pr-0" title={title}>
      <dt
        className={`text-[13px] ${alert ? 'text-alert' : 'text-ink-muted'} ${title ? 'cursor-help' : ''}`}
      >
        {label}
      </dt>
      <dd className={`mt-0.5 text-2xl leading-[1.2] font-semibold ${alert ? 'text-alert' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
