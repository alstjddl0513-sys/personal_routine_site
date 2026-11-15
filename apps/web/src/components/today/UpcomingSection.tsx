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

// 유형 점 + 글자색. [글자, 점]
const TYPE_TONE: Record<CompanyEventType, [string, string]> = {
  deadline: ['text-alert', 'bg-alert'],
  test: ['text-ev-test', 'bg-ev-test'],
  interview: ['text-ev-interview', 'bg-ev-interview'],
  announcement: ['text-ev-announce', 'bg-ev-announce'],
  other: ['text-ev-other', 'bg-ev-other'],
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
      aside={<CardLink href="/calendar">캘린더에서 보기</CardLink>}
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
            />
          ))}
        </ul>
      )}

      <TodayMemoInput
        date={todayIso}
        initial={memo?.content ?? ''}
        disabled={events === null}
      />
    </TodayCard>
  );
}

function EventRow({ event, today }: { event: JobEvent; today: Date }) {
  const d = parseISODate(event.date);
  const diff = d
    ? Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const label = COMPANY_EVENT_TYPE_LABELS[event.type];
  const dateText = d
    ? `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} ${dowLabel(d)}`
    : event.date;
  const [fg, dot] = TYPE_TONE[event.type];

  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-4 border-t border-divider py-3.5">
      <span className="flex flex-col text-sm leading-[1.3]">
        <span className={`font-semibold ${diff === 0 ? 'text-alert' : ''}`}>
          {diff === null ? '' : diff === 0 ? '오늘' : `D-${diff}`}
        </span>
        <span className="text-ink-muted">{dateText}</span>
      </span>
      <span className="flex min-w-0 flex-col leading-[1.4]">
        <span className="truncate font-semibold">{event.companyName}</span>
        <span className="truncate text-sm text-ink-muted">{event.note || label}</span>
      </span>
      <span className={`inline-flex items-center gap-1.5 text-sm ${fg}`}>
        <span aria-hidden className={`h-1.75 w-1.75 rounded-full ${dot}`} />
        {label}
      </span>
    </li>
  );
}
