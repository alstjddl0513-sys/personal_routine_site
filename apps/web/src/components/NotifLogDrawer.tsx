'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  ListChecks,
  Sun,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { UserAnnouncement } from '@repo/shared';
import {
  clearLog,
  getLog,
  getServerSnapshot,
  markAllRead,
  removeLogEntry,
  subscribeLog,
  type NotifLogEntry,
  type NotifType,
} from '../lib/notif-log';
import {
  getAnnouncementsServerSnapshot,
  getServerAnnouncements,
  markAnnouncementReadAndSync,
  subscribeAnnouncements,
} from '../lib/announcements-sink';
import { useNotifPermission } from '../lib/notif-permission';
import { getMasterEnabled, subscribeMasterEnabled } from '../lib/notif-master';
import { ANNOUNCEMENT_KIND_ICON, getAnnouncementKindLabel } from '../lib/announcement-kind';
import { BUTTON_SECONDARY, BUTTON_TEXT, POPOVER_CLOSE } from './jobs/cells/popover-style';
import { ChipButton } from './learn/CategoryFilterChips';
import { StatusBadge } from './settings/lists/ListCard';
import { Portal } from './ui/Portal';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 꺼짐 안내 [알림 설정하기] — 드로어를 닫고 알림 설정 창을 엶 */
  onOpenSettings: () => void;
}

// 종류 아이콘은 모양만으로 구분, 색은 ink-muted 하나(색을 나누면 급한 뜻이 모든 마감 알림에 붙어 보임)
const ICON_MAP: Record<NotifType, LucideIcon> = {
  'deadline-d1': Clock,
  'deadline-d3': Clock,
  'morning-summary': Sun,
  'routine-reminder': ListChecks,
  'workout-skip': Dumbbell,
  'event-d3': CalendarDays,
  'event-d1': CalendarDays,
  'event-today': CalendarDays,
  'challenge-completed': Trophy,
};

// 병합용 통합 아이템. announcement인지 log entry인지 분기.
type MergedItem =
  | { kind: 'log'; entry: NotifLogEntry }
  | { kind: 'announcement'; entry: UserAnnouncement; firedAt: number };

// 드로어 필터 칩. 알림 종류 9개를 사용자가 떠올리는 단위로 묶음.
type FilterKey = 'all' | 'deadline' | 'event' | 'routine' | 'workout' | 'morning' | 'announcement';

const FILTERS: { key: Exclude<FilterKey, 'all'>; label: string }[] = [
  { key: 'deadline', label: '마감' },
  { key: 'event', label: '일정' },
  { key: 'routine', label: '루틴' },
  { key: 'workout', label: '운동' },
  { key: 'morning', label: '아침 요약' },
  { key: 'announcement', label: '공지' },
];

const LOG_FILTER: Record<NotifType, Exclude<FilterKey, 'all' | 'announcement'>> = {
  'deadline-d1': 'deadline',
  'deadline-d3': 'deadline',
  'event-d3': 'event',
  'event-d1': 'event',
  'event-today': 'event',
  'routine-reminder': 'routine',
  'challenge-completed': 'routine',
  'workout-skip': 'workout',
  'morning-summary': 'morning',
};

// localStorage에 남은 옛 버전 기록은 지금 없는 type일 수 있음 → undefined면
// '전체'에서만 보임 (ICON_MAP의 `?? Bell`과 같은 방어)
function filterOf(item: MergedItem): Exclude<FilterKey, 'all'> | undefined {
  return item.kind === 'announcement'
    ? 'announcement'
    : (LOG_FILTER as Partial<Record<string, Exclude<FilterKey, 'all'>>>)[item.entry.type];
}

function formatRelative(ms: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((now - ms) / 1000));
  if (diffSec < 60) return '방금';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const ANIM_MS = 150;
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// 알림 내역 창 (docs/design/rally-notif-drawer*.html) — 오른쪽 400px 세로 패널.
// 제목 줄 → [알림 꺼짐 안내] → [종류 칩] → 목록(divider) → [모두 지우기].
export function NotifLogDrawer({ open, onClose, onOpenSettings }: Props) {
  const router = useRouter();
  const log = useSyncExternalStore<readonly NotifLogEntry[]>(
    subscribeLog,
    getLog,
    getServerSnapshot,
  );
  const announcements = useSyncExternalStore<readonly UserAnnouncement[]>(
    subscribeAnnouncements,
    getServerAnnouncements,
    getAnnouncementsServerSnapshot,
  );

  // 알림이 꺼져 있으면(브라우저 권한 없음 · 설정의 '알림 전체' 끔) 새 알림이 안 오니 맨 위에 알려줌
  const permission = useNotifPermission();
  const master = useSyncExternalStore<boolean | null>(subscribeMasterEnabled, () => getMasterEnabled(), () => null);
  const notifOff = (permission !== null && permission !== 'granted') || master === false;

  const items: MergedItem[] = useMemo(() => {
    const merged: MergedItem[] = [
      ...log.map((entry): MergedItem => ({ kind: 'log', entry })),
      ...announcements.map((entry): MergedItem => ({
        kind: 'announcement',
        entry,
        firedAt: new Date(entry.createdAt).getTime(),
      })),
    ];
    return merged.sort((a, b) => {
      const at = a.kind === 'log' ? a.entry.firedAt : a.firedAt;
      const bt = b.kind === 'log' ? b.entry.firedAt : b.firedAt;
      return bt - at;
    });
  }, [log, announcements]);

  // 종류별 개수 — 0개인 종류의 칩은 숨김
  const counts = useMemo(() => {
    const c: Partial<Record<FilterKey, number>> = { all: items.length };
    for (const item of items) {
      const k = filterOf(item);
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [items]);

  // 열 때마다 '전체'로 시작 (선택 저장 X). render-phase 비교로 리셋 —
  // effect에서 setState하면 react-hooks/set-state-in-effect 룰에 걸림.
  const [filter, setFilter] = useState<FilterKey>('all');
  const [prevOpen, setPrevOpen] = useState(open);
  // 닫힐 때 바로 안 지우고 닫기 애니메이션(150ms) 뒤에 — shown은 그려져 있는지, closing은 닫는 중인지
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFilter('all');
      setShown(true);
      setClosing(false);
    } else if (shown) {
      setClosing(true);
    }
  }
  // 선택한 종류의 마지막 알림을 지워 0개가 되면 전체로
  const activeFilter: FilterKey = filter === 'all' || counts[filter] ? filter : 'all';
  const visibleItems =
    activeFilter === 'all' ? items : items.filter((item) => filterOf(item) === activeFilter);
  const visibleFilters = FILTERS.filter((f) => counts[f.key]);

  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => {
      setShown(false);
      setClosing(false);
    }, reduce ? 0 : ANIM_MS);
    return () => window.clearTimeout(t);
  }, [closing]);

  // 열릴 때 unread 카운트 클리어(로컬만). 서버 공지는 개별 클릭으로 read.
  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  // 포커스: 열면 창 안(✕)으로, Tab은 창 안에서만 돎, 닫히면 열기 전 자리(🔔)로
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      returnTo?.focus();
    };
  }, [open, onClose]);

  if (!shown) return null;

  function handleLogClick(entry: NotifLogEntry) {
    router.push(entry.href);
    onClose();
  }

  const isEmpty = items.length === 0;

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/30 dark:bg-black/50 motion-reduce:animate-none ${
          closing ? 'animate-[fade-out_150ms_ease-in_forwards]' : 'animate-[fade-in_150ms_ease-out]'
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="알림 내역"
        className={`fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col bg-surface font-plex text-ink shadow-lg motion-reduce:animate-none md:w-100 md:border-l md:border-line ${
          closing ? 'animate-[drawer-out_150ms_ease-in_forwards]' : 'animate-[drawer-in_150ms_ease-out]'
        }`}
      >
        <header className="flex flex-none items-center justify-between py-3.5 pr-3 pl-5">
          <h2 className="text-lg font-bold">알림 내역</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className={POPOVER_CLOSE.replace('-mr-2 ', '')}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {notifOff ? (
          <div className="mx-5 mb-3 flex flex-none items-center gap-2.5 rounded-md border border-divider bg-thead px-3 py-2.5">
            <Bell className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
            <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft">알림이 꺼져 있어요.</p>
            <button type="button" onClick={onOpenSettings} className={`${BUTTON_SECONDARY} min-h-9! shrink-0`}>
              알림 설정하기
            </button>
          </div>
        ) : null}

        {/* 종류가 2가지 이상일 때만 칩 노출 — 한 종류뿐이면 거를 의미가 없음. 넘치면 다음 줄로(가로 스크롤 X) */}
        {visibleFilters.length > 1 ? (
          <div role="group" aria-label="알림 종류" className="flex flex-none flex-wrap gap-1.5 px-5 pb-3.5">
            {[{ key: 'all' as const, label: '전체' }, ...visibleFilters].map((f) => (
              <ChipButton
                key={f.key}
                active={activeFilter === f.key}
                onClick={() => setFilter(f.key)}
                label={f.label}
                count={counts[f.key]}
              />
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto border-t border-divider">
          {isEmpty ? (
            <p className="px-6 py-15 text-center text-[14.5px] text-ink-soft">아직 받은 알림이 없어요.</p>
          ) : visibleItems.length === 0 ? (
            <p className="px-6 py-15 text-center text-[14.5px] text-ink-soft">이 종류 알림은 아직 없어요.</p>
          ) : (
            <ul className="[&>li]:border-b [&>li]:border-divider [&>li:last-child]:border-b-0">
              {visibleItems.map((item) =>
                item.kind === 'log' ? (
                  <LogRow
                    key={`log-${item.entry.id}`}
                    entry={item.entry}
                    onClick={() => handleLogClick(item.entry)}
                    onRemove={() => removeLogEntry(item.entry.id)}
                  />
                ) : (
                  <AnnouncementRow key={`ann-${item.entry.id}`} entry={item.entry} firedAt={item.firedAt} />
                ),
              )}
            </ul>
          )}
        </div>

        {log.length > 0 ? (
          <footer className="flex-none border-t border-divider px-3 py-2">
            <button type="button" onClick={() => clearLog()} className={`${BUTTON_TEXT} text-[13.5px]`}>
              모두 지우기
            </button>
          </footer>
        ) : null}
      </aside>
    </Portal>
  );
}

// 알림 줄 — 줄(아이콘 · 글자)이 관련 화면으로 가는 버튼, ✕는 그 밖에(눌러도 이동 X).
// hover · 키보드 포커스 때 row-hover + 제목 밑줄 + › 보임. ✕는 늘 보임(키보드 · 터치에서도 찾게).
function LogRow({
  entry,
  onClick,
  onRemove,
}: {
  entry: NotifLogEntry;
  onClick: () => void;
  onRemove: () => void;
}) {
  const Icon = ICON_MAP[entry.type] ?? Bell;
  return (
    <li className="group flex items-start gap-1 py-3 pr-3 pl-5 hover:bg-row-hover has-[>button:first-child:focus-visible]:bg-row-hover has-[>button:first-child:focus-visible]:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left outline-none"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span
              title={entry.title}
              className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink-strong underline-offset-3 group-hover:underline group-has-[>button:first-child:focus-visible]:underline"
            >
              {entry.title}
            </span>
            <span className="shrink-0 text-[12.5px] text-ink-muted">{formatRelative(entry.firedAt)}</span>
          </span>
          <span className="flex items-end gap-2">
            <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55] whitespace-pre-line text-ink-soft">
              {entry.body}
            </span>
            <ChevronRight
              aria-hidden
              className="h-[15px] w-[15px] shrink-0 text-transparent group-hover:text-ink-muted group-has-[>button:first-child:focus-visible]:text-ink-muted"
            />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="이 알림 삭제"
        title="이 알림 삭제"
        className="-mt-1.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-faint outline-none hover:text-ink-muted focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

// 공지 줄 — 줄 전체가 그 자리 펼침(이동 X). 처음 펼칠 때 읽음. 공지는 지울 수 없음(일부러 남기는 글).
// 안 읽음: 왼쪽 primary 점 + 제목 700 + 종류 뱃지 / 읽음: 점 없음 + 흐린 글자 + "읽음" 뱃지(뱃지가 둘로 안 늘게 교체)
function AnnouncementRow({
  entry,
  firedAt,
}: {
  entry: UserAnnouncement;
  firedAt: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ANNOUNCEMENT_KIND_ICON[entry.kind];
  const isRead = entry.readAt !== null;

  function toggle() {
    setExpanded((v) => !v);
    if (!expanded && !isRead) {
      void markAnnouncementReadAndSync(entry.id);
    }
  }

  return (
    <li className={`relative ${expanded ? 'bg-thead' : 'hover:bg-row-hover'}`}>
      {!isRead ? (
        <span aria-hidden className="absolute top-[22px] left-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      ) : null}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-2.5 px-5 py-3 text-left outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span
              title={entry.title}
              className={`min-w-0 flex-1 truncate text-[14.5px] ${isRead ? 'font-medium text-ink-muted' : 'font-bold text-ink-strong'}`}
            >
              {!isRead ? <span className="sr-only">새 공지 </span> : null}
              {entry.title}
            </span>
            <span className="shrink-0 text-[12.5px] text-ink-muted">{formatRelative(firedAt)}</span>
            <ChevronDown
              aria-hidden
              className={`h-4 w-4 shrink-0 self-center text-ink-muted transition-transform motion-reduce:transition-none ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </span>
          <span className="flex">
            {isRead ? (
              <span className="inline-flex h-5 items-center rounded-sm border border-btn-border px-1.5 text-xs font-semibold text-icon-faint">
                읽음
              </span>
            ) : (
              <StatusBadge>{getAnnouncementKindLabel(entry.kind)}</StatusBadge>
            )}
          </span>
          <span
            className={`text-[13.5px] leading-[1.55] ${isRead ? 'text-ink-muted' : 'text-ink-soft'} ${
              expanded ? 'whitespace-pre-line' : 'line-clamp-2'
            }`}
          >
            {entry.body}
          </span>
        </span>
      </button>
    </li>
  );
}
