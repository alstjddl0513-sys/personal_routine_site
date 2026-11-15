'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { deleteMyAccount } from '@/lib/api';
import { SettingsDialog } from './SettingsDialog';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

const CONFIRM_WORD = '삭제';

// 실제로 지워지는 것과 같게 — 표가 늘면 여기도 같이(백업 export.service와 같은 범위)
const DELETED: [string, string][] = [
  ['채용', '회사 · 회사 유형 · 일정'],
  ['캘린더', '메모'],
  ['루틴', '루틴 · 체크 · 회고 · 챌린지'],
  ['운동', '기록 · 종목 · 분할 · 주간 목표'],
  ['학습', '질문 · 카테고리 · 학습 기록'],
  ['블로그', '구독한 블로그 · 가져온 글'],
  ['문서', '이력서 · 포트폴리오(올린 파일 포함)'],
  ['계정', '닉네임 · 설정'],
];

// 설정 맨 아래 오른쪽 끝 글자 버튼 "계정 삭제" → 확인 창("…" 표기는 오타처럼 보여서 뺌).
// 로그아웃(왼쪽)과 멀리 둬서 잘못 누르지 않게, 숨기지는 않음.
export function AccountDeleteRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 cursor-pointer items-center rounded-md px-2 text-sm font-medium text-alert hover:underline"
      >
        계정 삭제
      </button>
      {open ? <AccountDeleteModal onRequestClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AccountDeleteModal({ onRequestClose }: { onRequestClose: () => void }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canConfirm = checked && typed.trim() === CONFIRM_WORD && !isPending;

  function confirmDelete() {
    if (!canConfirm) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteMyAccount();
        // 서버가 auth.users를 지웠으므로 현재 세션은 무효. 클라이언트도
        // 명시적으로 signOut 해서 쿠키·로컬 스토리지 정리 후 /login.
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut().catch(() => {});
        router.replace('/login');
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('계정을 삭제하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <SettingsDialog
      open
      title="정말 계정을 삭제하시겠어요?"
      labelId="account-delete-title"
      onClose={onRequestClose}
      busy={isPending}
      widthClass="md:max-w-140"
    >
      <p className="text-ink-soft">
        계정을 삭제하면 아래 데이터가 <strong className="text-ink-strong">영구히 삭제</strong>되며{' '}
        <strong className="text-ink-strong">되돌릴 수 없어요.</strong>
      </p>
      <dl className="rounded-md border border-divider bg-thead px-4 py-1">
        {DELETED.map(([k, v]) => (
          <div
            key={k}
            className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 border-b border-divider py-2 text-sm last:border-b-0"
          >
            <dt className="font-semibold text-ink-soft">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={isPending}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
            checked ? 'bg-primary' : 'border-[1.5px] border-check-off'
          }`}
        >
          {checked ? <Check className="h-3.25 w-3.25 text-white dark:text-paper" strokeWidth={3.2} /> : null}
        </span>
        위 데이터가 모두 삭제되는 것을 확인했어요.
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-delete-confirm" className="text-sm text-ink-soft">
          확인을 위해 &ldquo;{CONFIRM_WORD}&rdquo;를 입력해주세요
        </label>
        <input
          id="account-delete-confirm"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={isPending}
          autoComplete="off"
          className="min-h-10 w-55 rounded-md border border-btn-border bg-surface px-3 text-[15px] text-ink outline-none focus:border-chip-on-border"
        />
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onRequestClose} disabled={isPending} className={BUTTON_SECONDARY}>
          취소
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={!canConfirm}
          className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold ${
            canConfirm || isPending
              ? 'cursor-pointer bg-alert text-white hover:opacity-90 dark:text-paper'
              : 'bg-divider text-icon-faint'
          }`}
        >
          {isPending ? '삭제 중…' : '영구 삭제'}
        </button>
      </div>
    </SettingsDialog>
  );
}
