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
import { ChevronRight, Trash2, X } from 'lucide-react';
import {
  COMPANY_EVENT_TYPE_LABELS,
  type SchedulerEvent,
} from '@repo/shared';
import { upsertSchedulerMemo } from '../../lib/api';
import { parseISODate } from '../../lib/routines-week';
import {
  BUTTON_PRIMARY,
  BUTTON_TEXT,
  POPOVER_CLOSE,
} from '../jobs/cells/popover-style';
import { EVENT_TONE } from './event-tone';

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

const SECTION_TITLE = 'text-[15px] font-bold text-heading';

// 선택된 날짜의 상세 패널. 데스크톱: 캘린더 오른쪽 고정 폭 카드
// (채용 '간단히' 사이드 패널과 같은 구조 — 제목 줄 + 구분선 섹션).
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

  const jobs = events.filter(
    (e): e is Extract<SchedulerEvent, { kind: 'job' }> => e.kind === 'job',
  );

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
        aria-labelledby="day-panel-title"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl md:static md:z-auto md:max-h-none md:overflow-visible md:rounded-lg md:shadow-none"
      >
        <header className="flex items-center justify-between gap-2 border-b border-divider py-3 pr-2.5 pl-5">
          <h2 id="day-panel-title" className="text-lg font-bold">
            {formatHeader(iso)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="날짜 패널 닫기"
            className={POPOVER_CLOSE.replace('-mr-2 ', '')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {/* Job 이벤트 섹션 — 읽기 전용, 고치기는 채용 리스트에서 */}
        <section
          aria-labelledby="day-panel-events"
          className="flex flex-col gap-1.5 border-b border-divider px-5 pt-4 pb-4.5"
        >
          <h3 id="day-panel-events" className={SECTION_TITLE}>
            채용 일정{' '}
            {jobs.length > 0 ? (
              <span className="font-medium text-ink-muted">{jobs.length}건</span>
            ) : null}
          </h3>
          {jobs.length === 0 ? (
            <p className="text-sm text-ink-muted">이 날 등록된 일정이 없어요.</p>
          ) : (
            <ul className="flex flex-col">
              {jobs.map((e, idx) => {
                const [text, dot] = EVENT_TONE[e.type];
                return (
                  <li
                    key={`${e.companyId}-${e.type}-${idx}`}
                    className="flex items-center gap-2.5 border-b border-divider py-2.5"
                  >
                    <span
                      className={`inline-flex w-11.5 shrink-0 items-center gap-1.5 text-[13px] font-semibold ${text}`}
                    >
                      <span aria-hidden className={`h-1.75 w-1.75 rounded-full ${dot}`} />
                      {COMPANY_EVENT_TYPE_LABELS[e.type]}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col leading-[1.35]">
                      <span className="truncate font-semibold">{e.companyName}</span>
                      {e.note ? (
                        <span className="truncate text-[13px] text-ink-muted">{e.note}</span>
                      ) : null}
                    </div>
                    <Link
                      href={`/jobs?highlight=${e.companyId}`}
                      aria-label={`${e.companyName} 채용 리스트에서 보기`}
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md border border-btn-border px-2.5 text-[13px] font-medium text-btn-fg hover:border-heading"
                    >
                      회사
                      <ChevronRight className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/jobs"
            className="mt-1 inline-flex min-h-10 items-center gap-1 self-start text-[13px] font-medium text-heading hover:underline"
          >
            채용 리스트에서 일정 추가하기
            <ChevronRight className="h-3 w-3" strokeWidth={2.2} aria-hidden />
          </Link>
        </section>

        {/* 메모 섹션 */}
        <section aria-labelledby="day-panel-memo" className="flex flex-col gap-2.5 px-5 pt-4 pb-4.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="day-panel-memo" className={SECTION_TITLE}>
              <label htmlFor="day-memo">메모</label>
            </h3>
            <span role="status" className="text-[13px]">
              {flash === 'saved' ? (
                <span className="text-ink-faint">저장됨</span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-warn">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" />
                  변경사항 있음
                </span>
              ) : null}
            </span>
          </div>
          <form onSubmit={save} className="flex flex-col gap-2.5">
            <textarea
              id="day-memo"
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
              rows={5}
              className="w-full resize-y rounded-md border border-btn-border bg-surface px-3 py-2.5 text-sm leading-[1.65] text-ink outline-none placeholder:text-ink-faint focus:border-heading"
            />
            <div className="mt-0.5 flex items-center justify-between gap-2">
              {savedContent ? (
                <button
                  type="button"
                  onClick={clearMemo}
                  disabled={isPending}
                  className={`${BUTTON_TEXT} gap-1.5`}
                >
                  <Trash2 className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
                  삭제
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={!dirty || isPending}
                aria-keyshortcuts="Meta+Enter Control+Enter"
                className={BUTTON_PRIMARY}
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
