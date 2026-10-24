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
import { StreakBadge } from '../StreakBadge';

const SEOUL = 'Asia/Seoul';

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: SEOUL }).format(now),
  );
  if (hour >= 5 && hour < 12) return '좋은 아침이에요';
  if (hour >= 12 && hour < 18) return '좋은 오후예요';
  return '오늘도 수고했어요';
}

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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-muted">{dateLabel}</span>
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink md:text-[30px]">
          {greeting(now)}
          {profile?.nickname ? `, ${profile.nickname}님` : ''}
        </h1>
        {summary ? (
          <p className="text-[15px] text-ink-muted">
            오늘 마감 <strong className="text-ink">{summary.todayDeadlines}건</strong>
            {' · '}일정 <strong className="text-ink">{summary.todayEvents}건</strong>
            {' · '}아직 체크 안 한 루틴{' '}
            <strong className="text-ink">{summary.uncheckedRoutines}개</strong>
          </p>
        ) : null}
      </div>
      {streak !== null && streak > 0 ? (
        <StreakBadge
          variant="pill"
          label="루틴"
          current={streak}
          best={bestStreak}
          unit="일"
        />
      ) : null}
    </header>
  );
}
