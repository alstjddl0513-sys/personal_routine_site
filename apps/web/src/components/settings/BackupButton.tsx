'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { getExportJson } from '../../lib/api';
import { toISODate } from '../../lib/routines-week';

export function BackupButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setBusy(true);
    try {
      const json = await getExportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rally-backup-${toISODate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Download className="h-4 w-4" aria-hidden />
        {busy ? '내보내는 중…' : 'JSON 백업 다운로드'}
      </button>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">에러: {error}</p>
      ) : null}
    </div>
  );
}
