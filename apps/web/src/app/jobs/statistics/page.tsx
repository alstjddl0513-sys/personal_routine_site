import { Suspense } from 'react';
import Link from 'next/link';
import {
  APPLICATION_STATUS_LABELS,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  type Company,
} from '@repo/shared';
import { getCompanies, getCompanyTypes } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import {
  INTERVIEW_STAGE_HINT,
  PIPELINE_STAGES,
  computeJobsSummary,
  computeKpi,
  computeMissedPostings,
  computePipeline,
  computeType1Distribution,
  computeType2Distribution,
  computeUpcomingDeadlines,
  filterRecentCompanies,
  periodStart,
} from '../../../lib/jobs-stats';

export const metadata = {
  title: '회사 통계 · Rally',
};

// 기업 통계 (docs/design/rally-stats.html). 숫자 정의는 lib/jobs-stats.ts 한 곳:
// 핵심 지표는 computeJobsSummary(상태 이력이 없어 추정 없이 셀 수 있는 것만), 막대는
// 지금 상태(computePipeline) — 리스트 지원상태 필터 개수와 같음. 비율은 분모를 같이.
// 단위: 기준(분모)·큰 숫자는 "개 회사", 그 안에서 센 개수는 "곳", 마감·공고는 "건".

const SEOUL = 'Asia/Seoul';
const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: SEOUL,
});

// "10.24 토 18:00" (withTime=false면 "10.24 토")
function formatDate(iso: string, withTime = true): string {
  const parts = dateFmt.formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const base = `${get('month')}.${get('day')} ${get('weekday')}`;
  return withTime ? `${base} ${get('hour')}:${get('minute')}` : base;
}

// "2026-08-03" → "8.03"
function shortDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}.${d}`;
}

// [전체 | 최근 3개월] — 링크라 서버에서 다시 그림(클라 상태 없음).
function PeriodToggle({ recent }: { recent: boolean }) {
  const options = [
    { label: '전체', href: '/jobs/statistics', active: !recent },
    { label: `최근 ${RECENT_MONTHS}개월`, href: '/jobs/statistics?period=3m', active: recent },
  ];
  return (
    <div role="group" aria-label="기간" className="inline-flex overflow-hidden rounded-md border border-btn-border">
      {options.map((o, i) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? 'true' : undefined}
          className={`inline-flex min-h-10 items-center px-3.5 text-sm ${i > 0 ? 'border-l border-btn-border' : ''} ${
            o.active ? 'bg-chip-on-bg font-semibold text-chip-on-fg' : 'bg-btn-bg text-ink-soft hover:text-ink'
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function pct(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

// 리스트 마감일 칸과 같은 표기·색: 오늘·내일 마감색, D-2~3 호박색.
function ddayLabel(daysLeft: number): string {
  if (daysLeft === 0) return '오늘';
  if (daysLeft === 1) return '내일';
  return `D-${daysLeft}`;
}
function ddayTone(daysLeft: number): string {
  if (daysLeft <= 1) return 'text-alert';
  if (daysLeft <= 3) return 'text-warn';
  return 'text-ink';
}

// 두 번째 줄(지원 상태·마감 임박·놓친 공고) 공용 흰 카드.
const STAT_CARD = 'rounded-lg border border-line bg-surface px-5 py-6 md:px-7';

// 기간: 주소 ?period=3m (새로고침·공유 유지), 기본 전체.
const RECENT_MONTHS = 3;

export default async function JobsStatisticsPage({
  searchParams,
}: PageProps<'/jobs/statistics'>) {
  const sp = await searchParams;
  const recent = (Array.isArray(sp.period) ? sp.period[0] : sp.period) === '3m';
  const start = recent ? periodStart(RECENT_MONTHS) : null;

  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-275 flex-col gap-8 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">회사 통계</h1>
            {/* 기간을 좁혔을 때만 기준을 알려줌 — 전체일 땐 설명이 필요 없어서 뺌 */}
            {start ? (
              <p className="text-[15px] text-ink-soft">
                {`최근 ${RECENT_MONTHS}개월(${shortDay(start)} ~ 오늘) 동안 담거나 지원한 회사예요.`}
              </p>
            ) : null}
          </div>
          <PeriodToggle recent={recent} />
        </header>

        <Suspense key={start ?? 'all'} fallback={<JobsStatisticsSkeleton />}>
          <JobsStatisticsContent start={start} />
        </Suspense>
      </div>
    </div>
  );
}

async function JobsStatisticsContent({ start }: { start: string | null }) {
  const [allRows, companyTypes] = await Promise.all([getCompanies(), getCompanyTypes()]);
  // 지표·막대·분포는 기간 안 회사만. 마감 임박(7일)·놓친 공고(30일)는 원래 기간이 정해진
  // 목록이라 전체에서.
  const rows = start ? filterRecentCompanies(allRows, start) : allRows;

  if (start && allRows.length > 0 && rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-btn-border bg-surface px-6 py-10 text-center text-[15px] text-ink-soft">
        최근 {RECENT_MONTHS}개월 동안 담거나 지원한 회사가 없어요.{' '}
        <Link href="/jobs/statistics" className="font-medium text-heading underline underline-offset-2">
          전체 기간
        </Link>
        으로 볼 수 있어요.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-btn-border bg-surface px-6 py-10 text-center text-[15px] text-ink-soft">
        아직 담아둔 회사가 없어요.{' '}
        <Link href="/jobs" className="font-medium text-heading underline underline-offset-2">
          채용 리스트
        </Link>
        에서 첫 회사를 담아보세요.
      </p>
    );
  }

  const kpi = computeKpi(rows);
  const summary = computeJobsSummary(rows);
  const pipeline = computePipeline(rows);
  const typeLabels: Record<string, string> = Object.fromEntries(
    companyTypes.map((t) => [t.key, t.label]),
  );
  const byType = computeType2Distribution(
    rows,
    companyTypes.map((t) => t.key),
  );
  const bySize = computeType1Distribution(rows);
  const upcoming = computeUpcomingDeadlines(allRows);
  const missed = computeMissedPostings(allRows);
  const companyById = new Map(allRows.map((c) => [c.id, c]));

  return (
    <>
      {/* 위 지표들과 관계없는 리스트 전체 숫자는 한 줄로 */}
      <p className="-mt-5 text-sm text-ink-muted">
        담아둔 <strong className="font-semibold text-ink-soft">{kpi.total}</strong>개 회사 · 채용중{' '}
        <strong className="font-semibold text-ink-soft">{kpi.hiring}</strong>곳 · 즐겨찾기{' '}
        <strong className="font-semibold text-ink-soft">{kpi.favorite}</strong>곳
      </p>
      <KeyMetrics kpi={kpi} summary={summary} />

      <div className="flex flex-wrap items-start gap-x-10 gap-y-8">
        <Pipeline total={kpi.total} pipeline={pipeline} />

        {/* 두 번째 줄은 왼쪽 지원 상태와 같은 흰 카드로 — 같은 줄 무게를 맞춤.
            (위 핵심 지표 띠·아래 분포는 선으로: 요약 띠 → 주요 내용 카드 → 보조 정보) */}
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
          <section aria-labelledby="soon-title" className={`flex flex-col gap-1.5 ${STAT_CARD}`}>
            <SectionHead id="soon-title" title="마감 임박" aside={`7일 안 · 진행 중 ${upcoming.length}건`} />
            {upcoming.length === 0 ? (
              <Empty>일주일 안에 마감되는 공고가 없어요. 여유롭게 준비하세요.</Empty>
            ) : (
              <ul>
                {upcoming.map((u) => (
                  <li
                    key={u.id}
                    className="flex min-h-14 items-center gap-3.5 border-b border-divider last:border-b-0"
                  >
                    <span className={`w-10 flex-none text-[15px] font-semibold ${ddayTone(u.daysLeft)}`}>
                      {ddayLabel(u.daysLeft)}
                    </span>
                    <span className="flex min-w-0 flex-auto flex-col leading-snug">
                      <CompanyLink id={u.id} name={u.name} />
                      <span className="text-[13px] text-ink-muted">
                        {formatDate(u.deadline)} · {APPLICATION_STATUS_LABELS[u.applicationStatus]}
                      </span>
                    </span>
                    {u.postingUrl ? (
                      <a
                        href={u.postingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 flex-none items-center rounded-md border border-btn-border bg-btn-bg px-3 text-sm font-medium text-btn-fg hover:border-heading"
                      >
                        공고 →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="missed-title" className={`flex flex-col gap-1.5 ${STAT_CARD}`}>
            <SectionHead id="missed-title" title="놓친 공고" aside={`최근 30일 · 미지원으로 마감 ${missed.length}건`} />
            {missed.length === 0 ? (
              <Empty>최근 30일간 놓친 공고가 없어요.</Empty>
            ) : (
              <ul>
                {missed.map((m) => {
                  const type2 = companyById.get(m.id)?.type2;
                  return (
                    <li
                      key={m.id}
                      className="flex min-h-12 items-center gap-3.5 border-b border-divider last:border-b-0"
                    >
                      <CompanyLink id={m.id} name={m.name} muted />
                      <span className="flex-none text-[13px] text-ink-muted">
                        {formatDate(m.deadline, false)} 마감
                        {type2 ? ` · ${typeLabels[type2] ?? type2}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-14 gap-y-8 border-t border-rule pt-6">
        {/* 유형 = 사용자가 정한 type2, 규모 = 대기업·중소 등 type1 (예전엔 라벨이 뒤바뀌어 있었음) */}
        <Distribution
          title="유형 분포"
          total={kpi.total}
          items={Object.entries(byType).map(([k, n]) => ({
            key: k,
            label: typeLabels[k] ?? `${k} (삭제됨)`,
            count: n,
          }))}
        />
        <Distribution
          title="규모 분포"
          total={kpi.total}
          items={COMPANY_TYPE_1_VALUES.map((k) => ({
            key: k,
            label: COMPANY_TYPE_1_LABELS[k],
            count: bySize[k],
          }))}
        />
      </div>
    </>
  );
}

// 열마다 위 숫자 + 아래 그 내역 — 위에서 아래로 한 이야기.
// 지원한 회사 = 진행 중(2열) + 끝난 곳(1열 내역: 최종 합격·탈락·지원취소), 진행 중 = 2열 내역 합,
// 서류 통과율 = 통과 ÷ (통과 + 탈락).
// 서류 통과율을 믿을 만큼 결과가 나왔는지 — 미만이면 숫자를 흐리게 하고 알려줌.
const MIN_DECIDED = 5;

// 구성 막대·범례 점 색 (지원 상태 점과 같은 계열).
const SEG = {
  final: 'bg-marigold',
  failed: 'bg-st-failed',
  withdrawn: 'bg-icon-faint',
  waiting: 'bg-st-applied',
  interview: 'bg-st-int1-passed',
  passed: 'bg-primary',
} as const;

function KeyMetrics({
  kpi,
  summary,
}: {
  kpi: ReturnType<typeof computeKpi>;
  summary: ReturnType<typeof computeJobsSummary>;
}) {
  const appliedPct = pct(summary.applied, kpi.total);
  const rate = summary.documentPassRate;
  const decided = summary.documentPassed + summary.documentFailed;
  const fewSamples = rate !== null && decided < MIN_DECIDED;
  return (
    <section
      aria-label="핵심 지표"
      className="flex flex-col border-y border-rule pt-7 pb-5.5"
    >
      <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-3">
        {/* 막대 = 지원한 회사 중 끝난 곳 비율 (남은 칸 = 진행 중) */}
        <Metric
          label="지원한 회사"
          value={summary.applied}
          unit="곳"
          hint={`담아둔 ${kpi.total}개 회사 중 ${appliedPct ?? 0}%`}
          bar={
            <CompositionBar
              total={summary.applied}
              parts={[
                { value: summary.finalPassed, color: SEG.final },
                { value: summary.failed, color: SEG.failed },
                { value: summary.withdrawn, color: SEG.withdrawn },
              ]}
            />
          }
          first
        />
        <Metric
          label="진행 중"
          value={summary.inProgress}
          unit="곳"
          hint={`지원한 ${summary.applied}개 회사 중`}
          bar={
            <CompositionBar
              total={summary.inProgress}
              parts={[
                { value: summary.documentWaiting, color: SEG.waiting },
                { value: summary.interviewing, color: SEG.interview },
              ]}
            />
          }
        />
        {/* 분모는 결과 나온 곳만 — 결과 대기까지 넣으면 떨어진 것처럼 읽힘. /today와 같은 계산. */}
        <Metric
          label="서류 통과율"
          value={rate === null ? '—' : rate}
          unit={rate === null ? '' : '%'}
          muted={fewSamples}
          hint={
            rate === null
              ? '아직 서류 결과가 없어요'
              : `서류 결과 ${decided}곳 중${fewSamples ? ' · 표본 적음' : ''}`
          }
          bar={
            <CompositionBar
              total={decided}
              parts={[
                { value: summary.documentPassed, color: SEG.passed },
                { value: summary.documentFailed, color: SEG.failed },
              ]}
            />
          }
        />
      </div>
      {/* 위와 같은 3열·구분선. 두 줄 사이 간격은 셀 padding이라 세로선이 이어짐. */}
      <div className="grid grid-cols-1 border-t border-dashed border-divider sm:grid-cols-3">
        {/* 캡션 없이 위 지표 이름이 묶음 이름 역할. 점 색 = 위 막대 조각 색(범례).
            1열 탈락은 전체, 3열은 서류만이라 '서류'를 붙임. */}
        <SubGroup first>
          <SubStat label="최종 합격" value={summary.finalPassed} dot={SEG.final} />
          <SubStat label="탈락" value={summary.failed} dot={SEG.failed} />
          <SubStat label="지원취소" value={summary.withdrawn} dot={SEG.withdrawn} />
        </SubGroup>
        <SubGroup>
          <SubStat label="서류 결과 대기" value={summary.documentWaiting} dot={SEG.waiting} />
          <SubStat
            label="면접 단계"
            value={summary.interviewing}
            dot={SEG.interview}
            title={INTERVIEW_STAGE_HINT}
          />
        </SubGroup>
        <SubGroup>
          <SubStat label="서류 통과" value={summary.documentPassed} dot={SEG.passed} />
          <SubStat label="서류 탈락" value={summary.documentFailed} dot={SEG.failed} />
        </SubGroup>
      </div>
    </section>
  );
}

// 큰 숫자 → 구성 막대 → 설명(작고 흐리게) 순서.
function Metric({
  label,
  value,
  unit,
  hint,
  bar,
  muted,
  first,
}: {
  label: string;
  value: number | string;
  unit: string;
  hint: string;
  bar?: React.ReactNode;
  /** 표본이 적어 숫자를 흐리게 */
  muted?: boolean;
  first?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 pb-4.5 ${first ? 'sm:pr-6' : 'sm:border-l sm:border-rule sm:px-6'}`}
    >
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      <span className="flex items-baseline gap-1">
        <span
          className={`text-[44px] leading-[1.1] font-semibold tracking-[-0.02em] ${muted ? 'text-ink-muted' : ''}`}
        >
          {value}
        </span>
        {unit ? <span className="text-base whitespace-nowrap text-ink-soft">{unit}</span> : null}
      </span>
      {bar ? <div className="mt-1.5 mb-1">{bar}</div> : null}
      <span className="text-[13px] text-ink-muted">{hint}</span>
    </div>
  );
}

// 얇은 구성 막대. 조각 합이 total보다 작으면 남은 칸은 바탕색(예: 1열의 진행 중).
function CompositionBar({
  total,
  parts,
}: {
  total: number;
  parts: { value: number; color: string }[];
}) {
  return (
    <div aria-hidden className="flex h-1.5 w-full overflow-hidden bg-track">
      {total > 0
        ? parts.map((pt, i) =>
            pt.value > 0 ? (
              <span key={i} className={pt.color} style={{ width: `${(pt.value / total) * 100}%` }} />
            ) : null,
          )
        : null}
    </div>
  );
}

// 지표 아래 내역 한 칸. 첫 열 말고는 위 Metric과 같은 왼쪽 구분선·여백.
function SubGroup({ first, children }: { first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-wrap gap-x-6 gap-y-2 pt-4 ${first ? 'sm:pr-6' : 'sm:border-l sm:border-rule sm:px-6'}`}
    >
      {children}
    </div>
  );
}

// 내역 한 칸: "● 최종 합격" 위, 숫자 아래. 단위(곳)는 위 큰 숫자에만 — 반복하면 시끄러움.
// 0은 흐리게 (값 있는 칸이 먼저 보이게). 점이 있으면 숫자를 점(8px)+간격(6px)만큼
// 들여 라벨 글자 시작에 맞춤.
function SubStat({
  label,
  value,
  dot,
  title,
}: {
  label: string;
  value: number;
  /** 위 구성 막대 조각과 같은 색 */
  dot?: string;
  /** 라벨이 묶는 상태 (툴팁). */
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5" title={title}>
      <span className={`inline-flex items-center gap-1.5 text-sm text-ink-soft ${title ? 'cursor-help' : ''}`}>
        {dot ? <span aria-hidden className={`h-2 w-2 flex-none rounded-full ${dot}`} /> : null}
        {label}
      </span>
      <strong
        className={`text-xl leading-tight font-semibold ${value === 0 ? 'text-ink-faint' : 'text-ink'} ${dot ? 'pl-3.5' : ''}`}
      >
        {value}
      </strong>
    </div>
  );
}

// 지금 지원 상태별 막대 — 리스트의 지원상태 필터 개수와 같고, 합치면 전체 회사 수.
// 탈락 4종은 한 막대. 미지원·탈락·지원취소는 진행 중이 아니라 연하게.
const QUIET_STAGES = new Set(['not_applied', 'failed', 'withdrawn']);

function Pipeline({
  total,
  pipeline,
}: {
  total: number;
  pipeline: ReturnType<typeof computePipeline>;
}) {
  return (
    <section
      aria-labelledby="pipe-title"
      className={`flex min-w-0 flex-[1.4_1_480px] flex-col gap-4 ${STAT_CARD}`}
    >
      <SectionHead id="pipe-title" title="지원 상태" aside={`전체 ${total}개 회사`} />
      <ol className="flex flex-col gap-3">
        {PIPELINE_STAGES.map((st) => {
          const count = pipeline[st.key];
          return (
            <li key={st.key} className="grid grid-cols-[76px_minmax(0,1fr)_36px_40px] items-center gap-x-3">
              <span className="text-sm text-ink-soft">{st.label}</span>
              <span className="h-5.5 bg-track">
                <span
                  className={`block h-full ${QUIET_STAGES.has(st.key) ? 'bg-primary-soft' : 'bg-primary'}`}
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </span>
              {/* 분포와 같은 배치: 숫자는 막대 바로 옆, 전체 대비 %는 오른쪽 끝 */}
              <strong className={`text-base font-semibold ${count === 0 ? 'text-ink-faint' : ''}`}>
                {count}
              </strong>
              <span className="text-right text-[13px] text-ink-muted">{pct(count, total) ?? 0}%</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Distribution({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section aria-label={title} className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
      <SectionHead title={title} aside={`담아둔 ${total}개 회사`} />
      <ul className="flex flex-col gap-2.5">
        {items.map((it) => (
          <li
            key={it.key}
            className="grid grid-cols-[72px_minmax(0,1fr)_32px_40px] items-center gap-x-3 text-sm"
          >
            <span className="truncate text-ink-soft">{it.label}</span>
            <span className="h-1.5 bg-track">
              {/* 가장 많은 항목을 꽉 채운 상대 막대 — 오른쪽 %는 전체 대비 */}
              <span
                className="block h-full bg-primary-soft"
                style={{ width: `${(it.count / max) * 100}%` }}
              />
            </span>
            {/* 숫자는 막대 바로 옆, %는 오른쪽 끝에 따로 정렬 */}
            <strong className="font-semibold">{it.count}</strong>
            <span className="text-right text-[13px] text-ink-muted">{pct(it.count, total) ?? 0}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHead({ id, title, aside }: { id?: string; title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[17px] font-bold text-heading">
        {title}
      </h2>
      {aside ? <span className="text-[13px] text-ink-muted">{aside}</span> : null}
    </div>
  );
}

function CompanyLink({ id, name, muted }: { id: Company['id']; name: string; muted?: boolean }) {
  return (
    <Link
      href={`/jobs?highlight=${id}`}
      className={`min-w-0 flex-auto truncate underline-offset-2 hover:underline ${
        muted ? 'font-medium text-ink-soft' : 'self-start font-semibold text-ink'
      }`}
    >
      {name}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-ink-muted">{children}</p>;
}

function JobsStatisticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 border-y border-rule py-7 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="flex flex-wrap gap-10">
        <Skeleton className="h-80 min-w-0 flex-[1.4_1_480px]" />
        <Skeleton className="h-80 min-w-0 flex-[1_1_340px]" />
      </div>
      <div className="flex flex-wrap gap-14 border-t border-rule pt-6">
        <Skeleton className="h-40 min-w-0 flex-[1_1_360px]" />
        <Skeleton className="h-40 min-w-0 flex-[1_1_360px]" />
      </div>
    </>
  );
}
