'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { Exercise } from '@repo/shared';
import { BUTTON_PRIMARY, BUTTON_TEXT } from '../jobs/cells/popover-style';
import { SplitCreateDialog } from './splits/SplitCreateDialog';

const DISMISS_KEY = 'rally.workouts.splitIntroDismissed';
const DISMISS_EVENT = 'rally.workouts.splitIntroChanged';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(DISMISS_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

// 서버 스냅샷은 '닫힘' — 닫은 사람에게 긴 안내가 번쩍 보였다 사라지지 않게.
function useDismissed(): boolean {
  return useSyncExternalStore(subscribe, readDismissed, () => true);
}

function useCreateDialog(exercises: Exercise[]) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialog = open ? (
    <SplitCreateDialog
      exercises={exercises}
      onClose={() => setOpen(false)}
      onCreated={() => {
        setOpen(false);
        router.refresh();
      }}
    />
  ) : null;
  return { openDialog: () => setOpen(true), dialog };
}

// 종목은 있고 분할은 없을 때, 맨 위 줄(컨디션) 위에 한 줄 띠 — 운동 기록 화면에서
// 바로 분할을 만들게. "분할 없이 쓸게요"(고정 종목만 하는 사람)를 누르면 브라우저에
// 기억하고 띠 대신 맨 위 줄의 작은 [+ 분할 만들기](SplitIntroButton)만 남김.
export function SplitIntroBand({ exercises }: { exercises: Exercise[] }) {
  const dismissed = useDismissed();
  const { openDialog, dialog } = useCreateDialog(exercises);
  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface py-2 pr-3 pl-4.5">
      <p className="min-w-0 flex-1 text-ink-soft">
        <strong className="font-bold text-ink-strong">운동을 나눠서 하나요?</strong>
        &nbsp; 상체·하체처럼 나눠두면 그날 할 종목만 보여요.
      </p>
      <span className="flex items-center gap-1">
        {/* 안내 띠의 목적이 이 버튼 하나라 숲색으로 채움 */}
        <button type="button" onClick={openDialog} className={BUTTON_PRIMARY}>
          분할 만들기
        </button>
        <button type="button" onClick={dismiss} className={BUTTON_TEXT}>
          분할 없이 쓸게요
        </button>
      </span>
      {dialog}
    </div>
  );
}

// 안내를 닫은 뒤 맨 위 줄에 남는 글자 버튼 — 마음이 바뀌면 설정까지 안 가고 바로 시작.
export function SplitIntroButton({
  exercises,
  divider,
}: {
  exercises: Exercise[];
  /** 버튼이 보일 때만 그 뒤에 붙는 세로 구분선 */
  divider: React.ReactNode;
}) {
  const dismissed = useDismissed();
  const { openDialog, dialog } = useCreateDialog(exercises);
  if (!dismissed) return null;
  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1 px-1 text-sm text-ink-soft hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
        분할 만들기
      </button>
      {divider}
      {dialog}
    </>
  );
}
