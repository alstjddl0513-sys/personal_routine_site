import {
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEventType,
  type SchedulerEvent,
} from '@repo/shared';
import { getSchedulerEvents } from '../../lib/api';
import { addDays, dowLabel, parseISODate, toISODate } from '../../lib/routines-week';
import { getToday, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, TodayCard } from './Card';
import { TodayMemoInput } from './TodayMemoInput';

const WINDOW_DAYS = 14;
const MAX_ITEMS = 5;

const BADGE: Record<CompanyEventType, string> = {
  deadline: 'bg-deadline-bg text-deadline-fg',
  test: 'bg-test-bg text-test-fg',
  interview: 'bg-interview-bg text-interview-fg',
  announcement: 'bg-announce-bg text-announce-fg',
  other: 'bg-other-bg text-other-fg',
};

type JobEvent = Extract<SchedulerEvent, { kind: 'job' }>;

export async function UpcomingSection() {
  const { today, todayIso } = getToday();
  // 오늘 메모는 캘린더 날짜 메모(scheduler_memos)와 같은 칸 — 같은 응답에
  // kind:'memo'로 들어옴. day_notes는 루틴 주간 회고(월요일 키) 전용이라
  // 쓰면 월요일에 회고를 덮어씀.
  const events = await settle(
    getSchedulerEvents(todayIso, toISODate(addDays(today, WINDOW_DAYS))),
  );
  const memo = events?.find(
    (e): e is Extract<SchedulerEvent, { kind: 'memo' }> =>
      e.kind === 'memo' && e.date === todayIso,
  );

  const jobs = (events ?? [])
    .filter((e): e is JobEvent => e.kind === 'job')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_ITEMS);

  return (
    <TodayCard
      id="events-title"
      title="다가오는 일정"
      className="flex-[2_1_340px]"
      aside={<CardLink href="/calendar">캘린더 →</CardLink>}
    >
      {events === null ? (
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      ) : jobs.length === 0 ? (
        <CardMessage href="/calendar" linkLabel="캘린더에서 추가하기">
          2주 안에 잡힌 일정이 없어요.
        </CardMessage>
      ) : (
        <ul className="flex flex-col">
          {jobs.map((e, i) => (
            <EventRow
              key={`${e.companyId}-${e.date}-${e.type}-${i}`}
              event={e}
              today={today}
              last={i === jobs.length - 1}
            />
          ))}
        </ul>
      )}

      <div className="mt-auto">
        <TodayMemoInput
          date={todayIso}
          initial={memo?.content ?? ''}
          disabled={events === null}
        />
      </div>
    </TodayCard>
  );
}

function EventRow({ event, today, last }: { event: JobEvent; today: Date; last: boolean }) {
  const d = parseISODate(event.date);
  const diff = d
    ? Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const dday = diff === null ? '' : diff === 0 ? 'D-DAY' : `D-${diff}`;
  const label = COMPANY_EVENT_TYPE_LABELS[event.type];
  const dateText = d
    ? `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} (${dowLabel(d)})`
    : event.date;

  return (
    <li
      className={`flex items-center gap-3.5 py-3 ${last ? '' : 'border-b border-divider'}`}
    >
      <span
        className={`w-13.5 flex-none text-center font-display text-[17px] font-extrabold ${
          diff === 0 ? 'text-deadline-strong' : 'text-ink'
        }`}
      >
        {dday}
      </span>
      <span className="flex min-w-0 flex-auto flex-col">
        <span className="truncate font-medium text-ink">{event.companyName}</span>
        <span className="truncate text-[13px] text-ink-muted">
          {dateText} · {event.note || label}
        </span>
      </span>
      <span className={`shrink-0 rounded-md px-2.5 py-0.75 text-xs font-bold ${BADGE[event.type]}`}>
        {label}
      </span>
    </li>
  );
}
