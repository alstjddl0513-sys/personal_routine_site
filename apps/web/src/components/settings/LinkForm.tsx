'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createLinkDocument } from '../../lib/api';

// 외부 링크 추가 폼. 제목 + URL. URL은 서버에서 http/https 프리픽스 검증.
export function LinkForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const t = title.trim();
    const u = url.trim();
    if (!t) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(u)) {
      setError('http:// 또는 https:// 로 시작하는 URL을 입력하세요.');
      return;
    }
    startTransition(async () => {
      try {
        await createLinkDocument({ title: t, url: u });
        setTitle('');
        setUrl('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '추가에 실패했어요.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (예: 노션 포폴)"
          maxLength={200}
          className="min-h-9 rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 sm:w-40"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          maxLength={1000}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-9 flex-1 rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex min-h-9 items-center gap-1 rounded bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {pending ? '추가 중...' : '추가'}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
