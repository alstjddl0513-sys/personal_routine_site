import {
  APPLICATION_STATUS_LABELS,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  COMPANY_TYPE_2_LABELS,
  COMPANY_TYPE_2_VALUES,
} from '@repo/shared';
import { getCompanies } from '../../../lib/api';
import { StatCard } from '../../../components/jobs/StatCard';
import { StatBar } from '../../../components/jobs/StatBar';
import {
  PIPELINE_STAGES,
  computeKpi,
  computePipeline,
  computeType1Distribution,
  computeType2Distribution,
  computeUpcomingDeadlines,
} from '../../../lib/jobs-stats';

function formatDeadline(iso: string, daysLeft: number): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const dayLabel = daysLeft === 0 ? '오늘' : daysLeft === 1 ? '내일' : `D-${daysLeft}`;
  return `${dayLabel} · ${mm}/${dd} ${hh}:${mi}`;
}

export default async function JobsStatisticsPage() {
  const rows = await getCompanies();
  const kpi = computeKpi(rows);
  const pipeline = computePipeline(rows);
  const t1 = computeType1Distribution(rows);
  const t2 = computeType2Distribution(rows);
  const upcoming = computeUpcomingDeadlines(rows);

  const appliedPct =
    kpi.total > 0 ? Math.round((kpi.applied / kpi.total) * 100) : 0;
  const hiringPct =
    kpi.total > 0 ? Math.round((kpi.hiring / kpi.total) * 100) : 0;

  const pipelineHint = (count: number): string | undefined => {
    if (kpi.total === 0) return undefined;
    return `${Math.round((count / kpi.total) * 100)}%`;
  };

  const passRate = (count: number): string =>
    kpi.applied > 0 ? `${Math.round((count / kpi.applied) * 100)}%` : '—';
  const passHint = (count: number): string =>
    kpi.applied > 0 ? `${count} / ${kpi.applied}` : `${count} / 0`;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">기업 통계</h1>
        <p className="mt-1 text-sm text-zinc-500">
          기업 리스트를 집계한 스냅샷입니다.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="전체 회사" value={kpi.total} />
        <StatCard label="채용중" value={kpi.hiring} hint={`${hiringPct}%`} />
        <StatCard label="지원함" value={kpi.applied} hint={`${appliedPct}%`} />
        <StatCard label="즐겨찾기" value={kpi.favorite} />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="서류합격"
          value={passRate(pipeline.document_passed)}
          hint={passHint(pipeline.document_passed)}
          description="지원한 회사 기준"
        />
        <StatCard
          label="1차합격"
          value={passRate(pipeline.interview_1_passed)}
          hint={passHint(pipeline.interview_1_passed)}
          description="지원한 회사 기준"
        />
        <StatCard
          label="2차합격"
          value={passRate(pipeline.interview_2_passed)}
          hint={passHint(pipeline.interview_2_passed)}
          description="지원한 회사 기준"
        />
        <StatCard
          label="최종합격"
          value={passRate(pipeline.final_passed)}
          hint={passHint(pipeline.final_passed)}
          description="지원한 회사 기준"
        />
      </section>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium">지원 파이프라인</h2>
        <div className="flex flex-col gap-2">
          {PIPELINE_STAGES.map((s) => (
            <StatBar
              key={s.key}
              label={s.label}
              count={pipeline[s.key]}
              total={kpi.total}
              hint={pipelineHint(pipeline[s.key])}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-medium">유형 분포</h2>
          <div className="flex flex-col gap-2">
            {COMPANY_TYPE_1_VALUES.map((k) => (
              <StatBar
                key={k}
                label={COMPANY_TYPE_1_LABELS[k]}
                count={t1[k]}
                total={kpi.total}
              />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-medium">규모 분포</h2>
          <div className="flex flex-col gap-2">
            {COMPANY_TYPE_2_VALUES.map((k) => (
              <StatBar
                key={k}
                label={COMPANY_TYPE_2_LABELS[k]}
                count={t2[k]}
                total={kpi.total}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">마감 임박 (7일 이내)</h2>
          <span className="text-xs text-zinc-500">
            채용중 · 진행중 · {upcoming.length}건
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
            7일 이내 마감 예정 공고가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcoming.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`min-w-14 rounded px-1.5 py-0.5 text-center text-xs tabular-nums ${
                      u.daysLeft <= 1
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : u.daysLeft <= 3
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {formatDeadline(u.deadline, u.daysLeft).split(' · ')[0]}
                  </span>
                  <span className="font-medium">{u.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      u.applicationStatus === 'not_applied'
                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}
                  >
                    {APPLICATION_STATUS_LABELS[u.applicationStatus]}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-700 dark:text-zinc-200">
                    {formatDeadline(u.deadline, u.daysLeft).split(' · ')[1]}
                  </span>
                </div>
                {u.postingUrl ? (
                  <a
                    href={u.postingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    공고 →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
