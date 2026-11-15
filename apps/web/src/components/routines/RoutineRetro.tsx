'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { upsertDayNote } from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_TEXT } from '../jobs/cells/popover-style';

interface Props {
  // ISO date (YYYY-MM-DD) of the visible week's Monday — used as the storage key
  // in day_notes so each week has its own retro card.
  weekStart: string;
  initialContent: string;
}

// 주 이동 시 부모(app/routines/page.tsx)에서 key={week.from} 로 remount 시켜
// 폼 state를 fresh useState initial value로 리셋. 별도 sync useEffect 불필요.
export function RoutineRetro({ weekStart, initialContent }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [flash, setFlash] = useState<'saved' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const dirty = value !== savedContent;
  const hasSavedContent = savedContent.trim().length > 0;

  function onSave() {
    if (!dirty) return;
    startSave(async () => {
      try {
        await upsertDayNote(weekStart, value);
        setSavedContent(value);
        setFlash('saved');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function onDelete() {
    startDelete(async () => {
      try {
        await upsertDayNote(weekStart, '');
        setValue('');
        setSavedContent('');
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <section
      aria-labelledby="retro-title"
      className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-6 pt-5 pb-4.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="retro-title" className="text-[17px] font-bold text-heading">
          <label htmlFor="retro">이번 주 회고</label>
        </h2>
        <span role="status" className="text-[13px]">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" />
              변경사항 있음
            </span>
          ) : flash === 'saved' || hasSavedContent ? (
            <span className="text-ink-faint">저장됨</span>
          ) : null}
        </span>
      </div>
      <textarea
        id="retro"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onSave();
          }
        }}
        placeholder="이 주의 회고를 남겨보세요..."
        maxLength={2000}
        rows={4}
        className="w-full resize-y rounded-md border border-btn-border bg-surface px-3 py-2.5 text-sm leading-[1.65] text-ink outline-none placeholder:text-ink-faint focus:border-heading"
      />
      <div className="flex items-center justify-between gap-2">
        {hasSavedContent ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`${BUTTON_TEXT} gap-1.5`}
          >
            <Trash2 className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
            {deleting ? '삭제 중…' : '삭제'}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {dirty ? (
            <button type="button" onClick={() => setValue(savedContent)} className={BUTTON_TEXT}>
              되돌리기
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className={BUTTON_PRIMARY}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </section>
  );
}
