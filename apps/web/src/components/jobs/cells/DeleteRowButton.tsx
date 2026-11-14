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
}: {
  id: string;
  name: string;
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
        className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 md:hidden dark:text-red-400 dark:hover:bg-red-950/30"
      >
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
        body="되돌릴 수 없어요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
