import { computeMorningSummary } from '../../lib/morning-summary';
import { addDays } from '../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../lib/streak';
import {
  getToday,
  loadCompanies,
  loadProfile,
  loadRecentChecks,
  loadTimeBlocks,
  loadTodayCompanyEvents,
  settle,
} from '../../lib/today-data';

const SEOUL = 'Asia/Seoul';

export async function TodayHeader() {
  const { today } = getToday();
  const now = new Date();
  const [profile, companies, blocks, checks, events] = await Promise.all([
    loadProfile(),
    settle(loadCompanies()),
    settle(loadTimeBlocks()),
    settle(loadRecentChecks()),
    settle(loadTodayCompanyEvents()),
  ]);

  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: SEOUL,
  }).format(now);

  // 하나라도 못 불러오면 숫자가 틀리게 보이느니 요약 줄을 숨김.
  const summary =
    companies && blocks && checks && events
      ? computeMorningSummary(companies, blocks, checks, events, today)
      : null;

  const successDays = checks ? new Set(checks.map((c) => c.date)) : null;
  const streak = successDays ? calcDailyStreak(successDays, today) : null;
  const bestStreak = successDays
    ? calcBestDailyStreak(successDays, addDays(today, -180), today)
    : 0;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-rule pb-6">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif-kr text-[28px] leading-[1.2] font-semibold tracking-[-0.01em] text-ink-strong md:text-[34px]">
          {profile?.nickname ? (
            <>
              <span className="text-heading">{profile.nickname}</span>님 안녕하세요!
            </>
          ) : (
            '안녕하세요!'
          )}
        </h1>
        {summary ? (
          <p className="text-[15px] text-ink-soft">
            오늘 마감{' '}
            <strong
              className={`font-semibold ${summary.todayDeadlines > 0 ? 'text-alert' : 'text-ink-strong'}`}
            >
              {summary.todayDeadlines}건
            </strong>
            , 일정 <strong className="font-semibold text-ink-strong">{summary.todayEvents}건</strong>이
            있고 루틴은{' '}
            <strong className="font-semibold text-ink-strong">{summary.uncheckedRoutines}개</strong>{' '}
            남았어요.
          </p>
        ) : null}
      </div>
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink-strong">{dateLabel}</span>
        {streak !== null && streak > 0 ? (
          <>
            <span aria-hidden className="mx-2.5 text-rule">
              |
            </span>
            <span title={`최장 ${bestStreak}일`}>
              루틴 연속 <strong className="font-semibold text-ink-strong">{streak}일</strong>
            </span>
          </>
        ) : null}
      </p>
    </header>
  );
}
