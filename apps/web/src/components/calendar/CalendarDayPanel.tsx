'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, X } from 'lucide-react';
import {
  COMPANY_EVENT_TYPE_LABELS,
  type SchedulerEvent,
} from '@repo/shared';
import { upsertSchedulerMemo } from '../../lib/api';
import { parseISODate } from '../../lib/routines-week';

interface Props {
  iso: string;
  events: SchedulerEvent[];
  onClose: () => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatHeader(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
}

// 선택된 날짜의 상세 패널. 데스크톱: 캘린더 오른쪽 고정 폭 사이드.
// 모바일: 하단에서 올라오는 바텀시트. 둘 다 같은 콘텐츠 (이벤트 리스트 + 메모).
// job 이벤트는 read-only + /jobs 링크로 연결 (수정은 /jobs 쪽에서).
// memo는 inline 편집.
export function CalendarDayPanel({ iso, events, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 서버 데이터에서 현재 메모 content 추출.
  const serverMemo = events.find((e) => e.kind === 'memo');
  const serverContent = serverMemo?.kind === 'memo' ? serverMemo.content : '';

  const [draft, setDraft] = useState(serverContent);
  const [savedContent, setSavedContent] = useState(serverContent);
  const [flash, setFlash] = useState<'saved' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // iso가 바뀌면 draft/saved 재초기화. identity 비교로 effect 없이.
  const [isoFor, setIsoFor] = useState(iso);
  if (isoFor !== iso) {
    setIsoFor(iso);
    setDraft(serverContent);
    setSavedContent(serverContent);
    setFlash(null);
  }

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Esc로 닫기.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dirty = draft !== savedContent;

  function save(e?: FormEvent) {
    e?.preventDefault();
    if (!dirty) return;
    startTransition(async () => {
      try {
        await upsertSchedulerMemo(iso, draft);
        setSavedContent(draft);
        setFlash('saved');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function clearMemo() {
    if (!savedContent && !draft) return;
    startTransition(async () => {
      try {
        await upsertSchedulerMemo(iso, '');
        setDraft('');
        setSavedContent('');
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const jobs = events.filter((e) => e.kind === 'job');

  return (
    <>
      {/* 모바일 백드롭 — 바텀시트 모드에서만 보임 */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
      />
      <aside
        role="dialog"
        aria-label={`${formatHeader(iso)} 상세`}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col gap-3 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-2xl md:static md:z-auto md:max-h-none md:rounded-md md:border md:shadow-none dark:border-zinc-800 dark:bg-zinc-950"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {formatHeader(iso)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {/* Job 이벤트 섹션 */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            채용 일정
          </h3>
          {jobs.length === 0 ? (
            <p className="rounded border border-dashed border-zinc-200 px-3 py-2 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
              이 날 등록된 일정이 없어요.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-100 overflow-hidden rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {jobs.map((e, idx) => {
                if (e.kind !== 'job') return null;
                return (
                  <li
                    key={`${e.companyId}-${e.type}-${idx}`}
                    className="flex items-center gap-2 px-2.5 py-2 text-xs"
                  >
                    <span
                      className={`w-10 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-medium ${typeBadgeClass(e.type)}`}
                    >
                      {COMPANY_EVENT_TYPE_LABELS[e.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {e.companyName}
                      </div>
                      {e.note ? (
                        <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {e.note}
                        </div>
                      ) : null}
                    </div>
                    <Link
                      href={`/jobs?highlight=${e.companyId}`}
                      aria-label={`${e.companyName} 상세`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 메모 섹션 */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            메모
          </h3>
          <form onSubmit={save} className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="이 날 짧게 메모해보세요..."
              maxLength={500}
              rows={3}
              className="w-full resize-y rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500"
            />
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {flash === 'saved' ? '저장됨' : dirty ? '변경사항 있음' : ' '}
              </span>
              {savedContent ? (
                <button
                  type="button"
                  onClick={clearMemo}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  삭제
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!dirty || isPending}
                className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:cursor-default disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </section>
      </aside>
    </>
  );
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case 'deadline':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
    case 'test':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
    case 'interview':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300';
    case 'announcement':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}
