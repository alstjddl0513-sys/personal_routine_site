'use client';

import { useState, useTransition, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createLinkDocument } from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT_BASE } from '../jobs/cells/popover-style';
import { AddLine, INPUT_ERROR } from './lists/ListCard';

type FieldError = { field: 'title' | 'url' | 'server'; message: string };

// 카드 맨 아래 "+ 링크 추가" → 한 줄 [이름][주소][추가][취소]. URL은 서버에서도 http/https 검증.
export function LinkForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<FieldError | null>(null);

  function reset() {
    setTitle('');
    setUrl('');
    setError(null);
    setOpen(false);
  }

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();
    if (!t) {
      setError({ field: 'title', message: '이름을 입력하세요.' });
      return;
    }
    if (!/^https?:\/\/.+/i.test(u)) {
      setError({ field: 'url', message: '주소는 http:// 또는 https://로 시작해야 해요.' });
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createLinkDocument({ title: t, url: u });
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError({ field: 'server', message: '추가하지 못했어요. 잠시 후 다시 해보세요.' });
      }
    });
  }

  if (!open) return <AddLine label="링크 추가" onClick={() => setOpen(true)} />;

  const input = `${POPOVER_INPUT_BASE} w-full text-[15px]`;
  return (
    <form onSubmit={submit} className="flex flex-col gap-1 border-t border-divider py-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1.3fr_auto_auto]">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') reset();
          }}
          placeholder="이름 (예: 노션 포트폴리오)"
          aria-label="링크 이름"
          aria-invalid={error?.field === 'title'}
          maxLength={200}
          autoFocus
          disabled={pending}
          className={`${input} ${error?.field === 'title' ? INPUT_ERROR : ''}`}
        />
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') reset();
          }}
          placeholder="https://..."
          aria-label="링크 주소"
          aria-invalid={error?.field === 'url'}
          maxLength={1000}
          disabled={pending}
          className={`${input} ${error?.field === 'url' ? INPUT_ERROR : ''}`}
        />
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? '추가 중…' : '추가'}
        </button>
        <button type="button" onClick={reset} disabled={pending} className={BUTTON_SECONDARY}>
          취소
        </button>
      </div>
      {error ? <p className="text-[13px] text-alert">{error.message}</p> : null}
    </form>
  );
}
