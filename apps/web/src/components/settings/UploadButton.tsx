'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Loader2 } from 'lucide-react';
import {
  DOCUMENT_ALLOWED_MIME,
  type DocumentKind,
} from '@repo/shared';
import {
  completeDocumentUpload,
  deleteDocument,
  initDocumentUpload,
  patchDocument,
  uploadDocumentFile,
} from '../../lib/api';
import { FOCUS_RING } from './lists/ListCard';

export interface UploadingFile {
  name: string;
  size: number;
}

interface Props {
  kind: Exclude<DocumentKind, 'link'>;
  maxBytes: number;
  title: string;
  /** 오류는 섹션이 카드 위 한 줄로 */
  onError: (msg: string | null) => void;
  /** 올리는 동안 섹션이 목록 끝에 "올리는 중…" 줄 */
  onUploading: (file: UploadingFile | null) => void;
  /** 섹션에 대표가 없으면 true — 다 올라간 파일을 대표로(채용 리스트 제출본 자동 기록이 대표를 씀) */
  makeActive: boolean;
}

// 카드 맨 아래 "↑ PDF 올리기" — 파일 선택 + 클라 사전 검증 + 2단계 업로드. 성공 시 router.refresh.
export function UploadButton({ kind, maxBytes, title, onError, onUploading, makeActive }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function trigger() {
    onError(null);
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하도록 reset
    if (!file) return;

    if (!(DOCUMENT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      onError('PDF 파일만 올릴 수 있어요.');
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / 1024 / 1024);
      onError(`${mb}MB보다 큰 파일은 올릴 수 없어요.`);
      return;
    }

    onError(null);
    onUploading({ name: file.name, size: file.size });
    startTransition(async () => {
      let createdId: string | null = null;
      try {
        // 제목은 파일명(확장자 제거)을 기본값으로 — 목록에서 ✎로 바꿀 수 있음.
        const defaultTitle =
          file.name.replace(/\.pdf$/i, '').slice(0, 200) || title;
        const { uploadUrl, document } = await initDocumentUpload({
          kind,
          title: defaultTitle,
          fileName: file.name,
          fileSize: file.size,
          fileMime: 'application/pdf',
        });
        createdId = document.id;
        await uploadDocumentFile(uploadUrl, file);
        // 서버가 파일이 있는 걸 확인하고 경로를 채움 — 안 되면 목록에 "올리다 멈춤"으로 남음
        await completeDocumentUpload(document.id);
        // 파일이 실제로 올라간 뒤에만 대표로 — init 때 정하면 올리다 실패한 파일이 대표가 될 수 있어서
        if (makeActive) {
          await patchDocument(document.id, { isActive: true }).catch((err) => console.error(err));
        }
        router.refresh();
      } catch (err) {
        console.error(err);
        onError('올리지 못했어요. 잠시 후 다시 해보세요.');
        // 이 화면에서 실패한 건 바로 치움 — "올리다 멈춤"은 창을 닫는 등 중간에 끊긴 경우만 남게
        if (createdId) await deleteDocument(createdId).catch((e) => console.error(e));
      } finally {
        onUploading(null);
      }
    });
  }

  return (
    <div className="border-t border-divider py-2">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className={`-ml-1 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium text-btn-fg hover:text-heading disabled:cursor-progress disabled:text-ink-muted ${FOCUS_RING}`}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowUp className="h-4 w-4" aria-hidden />
        )}
        {pending ? '올리는 중…' : 'PDF 올리기'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
