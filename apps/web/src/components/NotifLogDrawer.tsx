'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Sunrise,
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
import {
  ANNOUNCEMENT_KIND_COLOR,
  ANNOUNCEMENT_KIND_ICON,
} from '../lib/announcement-kind';
import { Portal } from './ui/Portal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<NotifType, LucideIcon> = {
  'deadline-d1': Briefcase,
  'deadline-d3': Briefcase,
  'morning-summary': Sunrise,
  'routine-reminder': CalendarClock,
  'workout-skip': Dumbbell,
};

// 병합용 통합 아이템. announcement인지 log entry인지 분기.
type MergedItem =
  | { kind: 'log'; entry: NotifLogEntry }
  | { kind: 'announcement'; entry: UserAnnouncement; firedAt: number };

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

export function NotifLogDrawer({ open, onClose }: Props) {
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

  // 열릴 때 unread 카운트 클리어(로컬만). 서버 공지는 개별 클릭으로 read.
  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleLogClick(entry: NotifLogEntry) {
    router.push(entry.href);
    onClose();
  }

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-label="알림 내역"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-lg md:max-w-sm md:border-l md:border-zinc-200 dark:bg-zinc-950 md:dark:border-zinc-800"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-500" aria-hidden />
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              알림 내역
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Bell
                className="h-8 w-8 text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                아직 받은 알림이 없어요.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                여기에 최근 알림이 쌓여요.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item) =>
                item.kind === 'log' ? (
                  <LogRow
                    key={`log-${item.entry.id}`}
                    entry={item.entry}
                    onClick={() => handleLogClick(item.entry)}
                    onRemove={() => removeLogEntry(item.entry.id)}
                  />
                ) : (
                  <AnnouncementRow
                    key={`ann-${item.entry.id}`}
                    entry={item.entry}
                    firedAt={item.firedAt}
                  />
                ),
              )}
            </ul>
          )}
        </div>

        {log.length > 0 ? (
          <footer className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => clearLog()}
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              브라우저 알림 이력 지우기
            </button>
          </footer>
        ) : null}
      </aside>
    </Portal>
  );
}

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
    <li className="group relative flex items-stretch transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-start gap-3 px-4 py-3 pr-10 text-left"
      >
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {entry.title}
            </div>
            <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
              {formatRelative(entry.firedAt)}
            </span>
          </div>
          <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
            {entry.body}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="이 알림 삭제"
        className="absolute right-3 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 opacity-100 transition-opacity hover:bg-zinc-200/60 hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );
}

function AnnouncementRow({
  entry,
  firedAt,
}: {
  entry: UserAnnouncement;
  firedAt: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ANNOUNCEMENT_KIND_ICON[entry.kind];
  const color = ANNOUNCEMENT_KIND_COLOR[entry.kind];
  const isRead = entry.readAt !== null;

  function toggle() {
    setExpanded((v) => !v);
    // 첫 확장 시 서버에 읽음 처리. 목록엔 남지만 dim으로 시각 구분.
    if (!expanded && !isRead) {
      void markAnnouncementReadAndSync(entry.id);
    }
  }

  // 안 읽음: 파랑 강조 배경. 읽음: 배경 없고 흐리게.
  const bgClass = isRead
    ? 'bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
    : 'bg-sky-50/60 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/40';

  return (
    <li className={`flex items-stretch transition-colors ${bgClass}`}>
      <button
        type="button"
        onClick={toggle}
        className="flex flex-1 items-start gap-3 px-4 py-3 text-left"
      >
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${color} ${isRead ? 'opacity-50' : ''}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div
              className={`flex min-w-0 items-center gap-1.5 ${
                isRead ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {!isRead ? (
                <span
                  aria-label="새 공지"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                />
              ) : null}
              <div className={`truncate text-sm ${isRead ? 'font-normal' : 'font-medium'}`}>
                {entry.title}
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
              {formatRelative(firedAt)}
            </span>
          </div>
          <p
            className={`mt-0.5 break-keep text-xs ${
              isRead ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-300'
            } ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
          >
            {entry.body}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        ) : (
          <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        )}
      </button>
    </li>
  );
}
