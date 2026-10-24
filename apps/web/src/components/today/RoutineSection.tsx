import { getRoutineChallenges } from '../../lib/api';
import { formatTimeRange } from '../../lib/routines-time';
import { parseISODate } from '../../lib/routines-week';
import { getToday, loadRecentChecks, loadTimeBlocks, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, ProgressBar, TodayCard } from './Card';
import { RoutineChecklist } from './RoutineChecklist';

export async function RoutineSection() {
  const { today, todayIso } = getToday();
  const [blocks, checks, challenges] = await Promise.all([
    settle(loadTimeBlocks()),
    settle(loadRecentChecks()),
    settle(getRoutineChallenges('active')),
  ]);

  if (!blocks || !checks) {
    return (
      <TodayCard id="routine-title" title="오늘 루틴" className="flex-[1_1_320px]">
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      </TodayCard>
    );
  }

  const active = blocks
    .filter((b) => !b.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const checkedIds = checks.filter((c) => c.date === todayIso).map((c) => c.blockId);
  const items = active.map((b) => ({
    id: b.id,
    label: b.label,
    time: formatTimeRange(b.startTime, b.endTime),
  }));

  const challenge = challenges?.[0];
  const start = challenge ? parseISODate(challenge.startDate) : null;
  const dPlus =
    start !== null
      ? Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null;

  return (
    <TodayCard
      id="routine-title"
      title="오늘 루틴"
      className="flex-[1_1_320px]"
      aside={items.length === 0 ? <CardLink href="/routines">트래커 →</CardLink> : undefined}
    >
      {items.length === 0 ? (
        <CardMessage href="/routines" linkLabel="루틴 만들기">
          아직 등록한 루틴이 없어요.
        </CardMessage>
      ) : (
        <RoutineChecklist date={todayIso} items={items} initialChecked={checkedIds} />
      )}

      {challenge ? (
        <div className="mt-auto flex flex-col gap-2 rounded-[14px] bg-surface-muted px-4 py-3.5">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="truncate font-bold text-ink">{challenge.title}</span>
            <span className="shrink-0 text-ink-muted">
              {dPlus !== null ? `D+${dPlus} · ` : ''}
              {challenge.targetDays}일 목표
            </span>
          </div>
          <ProgressBar
            pct={(challenge.successDays / challenge.targetDays) * 100}
            barClassName="bg-lime"
          />
        </div>
      ) : null}
    </TodayCard>
  );
}
