'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteCompany } from '../../../lib/api';
import { deleteConfirmTitle } from '../../../lib/korean';
import { ListConfirmDialog } from '../../settings/lists/ListConfirmDialog';

export function DeleteRowButton({
  id,
  name,
  eventCount = 0,
  hasNote = false,
}: {
  id: string;
  name: string;
  /** 확인 창 문장에 같이 사라지는 것을 넣음(rally-mobile-jobs-parts) */
  eventCount?: number;
  hasNote?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteCompany(id);
        router.refresh();
        setOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // 모바일 펼친 카드 맨 아래 글자 버튼(rally-mobile-jobs)
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium text-alert hover:bg-row-hover md:hidden"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        삭제
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${name} 삭제`}
        className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-row-hover hover:text-alert focus-visible:opacity-100 md:inline-flex"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>

      <ListConfirmDialog
        open={open}
        title={deleteConfirmTitle(name)}
        body={deleteBody(eventCount, hasNote)}
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

// "일정 2건과 메모도 함께 사라져요. 되돌릴 수 없어요." — 같이 사라지는 게 없으면 뒤 문장만
function deleteBody(eventCount: number, hasNote: boolean): string {
  const parts = [eventCount > 0 ? `일정 ${eventCount}건` : null, hasNote ? '메모' : null].filter(Boolean);
  if (parts.length === 0) return '되돌릴 수 없어요.';
  return `${parts.join('과 ')}도 함께 사라져요. 되돌릴 수 없어요.`;
}
