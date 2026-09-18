'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import {
  DOCUMENT_ALLOWED_MIME,
  type DocumentKind,
} from '@repo/shared';
import { initDocumentUpload, uploadDocumentFile } from '../../lib/api';

interface Props {
  kind: Exclude<DocumentKind, 'link'>;
  maxBytes: number;
  title: string;
}

// 파일 선택 트리거 + 클라 사전 검증 + 2단계 업로드. 성공 시 router.refresh로
// 서버 fetch 재조회.
export function UploadButton({ kind, maxBytes, title }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function trigger() {
    setError(null);
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하도록 reset
    if (!file) return;

    if (!(DOCUMENT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      setError(`PDF 파일만 업로드할 수 있어요. (${file.type || '알 수 없는 형식'})`);
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / 1024 / 1024);
      setError(`${mb}MB 이하 파일만 업로드할 수 있어요.`);
      return;
    }

    startTransition(async () => {
      try {
        // 제목은 파일명(확장자 제거)을 기본값으로. 나중에 편집 UI 붙이기 전까지
        // 그대로 사용.
        const defaultTitle =
          file.name.replace(/\.pdf$/i, '').slice(0, 200) || title;
        const { uploadUrl } = await initDocumentUpload({
          kind,
          title: defaultTitle,
          fileName: file.name,
          fileSize: file.size,
          fileMime: 'application/pdf',
        });
        await uploadDocumentFile(uploadUrl, file);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '업로드에 실패했어요.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="inline-flex items-center gap-1.5 self-start rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        {pending ? '업로드 중...' : `+ PDF 업로드`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
