import { getRoutineChallenges } from '../../lib/api';
import { formatTimeRange } from '../../lib/routines-time';
import { parseISODate } from '../../lib/routines-week';
import { getToday, loadRecentChecks, loadTimeBlocks, settle } from '../../lib/today-data';
import {
  CARD_CLASS,
  CardLink,
  CardMessage,
  LOAD_ERROR_COPY,
  ProgressBar,
  TodayCard,
} from './Card';
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
      <TodayCard id="routine-title" title="오늘 루틴">
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

  if (items.length === 0) {
    return (
      <TodayCard
        id="routine-title"
        title="오늘 루틴"
        aside={<CardLink href="/routines">트래커</CardLink>}
      >
        <CardMessage href="/routines" linkLabel="루틴 만들기">
          아직 등록한 루틴이 없어요.
        </CardMessage>
      </TodayCard>
    );
  }

  return (
    <section aria-labelledby="routine-title" className={CARD_CLASS}>
      <RoutineChecklist
        titleId="routine-title"
        title="오늘 루틴"
        date={todayIso}
        items={items}
        initialChecked={checkedIds}
      />

      {challenge ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          <span>진행 중인 챌린지</span>
          <strong className="font-semibold text-ink-strong">{challenge.title}</strong>
          <ProgressBar
            pct={(challenge.successDays / challenge.targetDays) * 100}
            className="h-0.75 flex-[1_1_80px]"
            barClassName="bg-marigold"
          />
          <span title={dPlus !== null ? `시작한 지 ${dPlus}일째` : undefined}>
            {challenge.successDays} / {challenge.targetDays}일
          </span>
        </div>
      ) : null}
    </section>
  );
}
