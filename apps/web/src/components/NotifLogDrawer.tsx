'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  CalendarClock,
  Dumbbell,
  Sunrise,
  X,
  type LucideIcon,
} from 'lucide-react';
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

  // 열릴 때 unread 카운트 클리어. 목록 자체는 유지.
  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  // Esc로 닫기 + 열려있는 동안 body 스크롤 잠금.
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

  function handleClick(entry: NotifLogEntry) {
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
          {log.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Bell
                className="h-8 w-8 text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                아직 받은 알림이 없어요.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                여기에 최근 30건까지 쌓여요.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {log.map((e) => {
                const Icon = ICON_MAP[e.type] ?? Bell;
                return (
                  <li
                    key={e.id}
                    className="group relative flex items-stretch transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(e)}
                      className="flex flex-1 items-start gap-3 px-4 py-3 pr-10 text-left"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            {e.title}
                          </div>
                          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                            {formatRelative(e.firedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
                          {e.body}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLogEntry(e.id)}
                      aria-label="이 알림 삭제"
                      className="absolute right-3 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 opacity-100 transition-opacity hover:bg-zinc-200/60 hover:text-zinc-700 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
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
              모두 지우기
            </button>
          </footer>
        ) : null}
      </aside>
    </Portal>
  );
}
