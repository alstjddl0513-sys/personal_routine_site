'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import type { Document } from '@repo/shared';
import {
  deleteDocument,
  getDocumentDownloadUrl,
  patchDocument,
} from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT, POPOVER_INPUT_BASE } from '../jobs/cells/popover-style';
import { ExpandPanel, Field, INPUT_ERROR, ROW_ACTION, RowAction, StatusBadge } from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { deleteConfirmTitle, directionParticle } from '../../lib/korean';

interface Props {
  document: Document;
  /** 방금 생긴 줄 — 2.5초 강조 */
  flash?: boolean;
  /** 이 줄(대표)을 지우면 대신 대표가 될 파일 */
  nextActive?: Pick<Document, 'id' | 'title'> | null;
}

// 확인 창 제목에 넣을 이름 — 길면 앞부분만
function shorten(text: string, max = 40): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

// 대표를 지울 때 확인 창 한 줄 — "대표는 'OO'으로/로 바뀌어요.", 한글로 안 끝나면 조사 없이
function nextActiveSentence(name: string): string {
  const p = directionParticle(name);
  return p ? `대표는 '${name}'${p} 바뀌어요.` : `'${name}' 파일이 대표가 돼요.`;
}

// 내려받을 파일 이름 — 제목 + .pdf. 파일 이름에 못 쓰는 문자(\ / : * ? " < > |)는 _로.
function downloadFileName(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 150) || 'document';
  return /\.pdf$/i.test(safe) ? safe : `${safe}.pdf`;
}

type LinkDraft = { title: string; url: string };
type LinkError = { field: 'title' | 'url'; message: string };

export function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// 대표 라디오 — 네이티브 radio라 방향키 · Space 그대로. 20px 원(2px 테두리), 켜지면 primary + 가운데 10px 점.
// 누르는 영역은 바깥 label 40px, 포커스 링도 label에.
const RADIO =
  'h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-btn-border bg-surface outline-none checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--rally-surface)] disabled:cursor-default';
const RADIO_LABEL =
  '-ml-2.5 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md has-[input:focus-visible]:shadow-[0_0_0_2px_var(--rally-surface),0_0_0_4px_var(--rally-chip-on-border)]';

// 문서 한 줄 (docs/design/rally-settings-docs*.html).
// 파일: [대표 라디오] 이름(누르면 미리보기) + 뱃지 / "PDF · 1.2MB" … [다운로드][이름 고치기][삭제]
// 링크: 라디오 없음(회사 제출본은 파일뿐), 주소 고정폭 … [새 탭에서 열기][이름 고치기][삭제]
// 올리다 멈춘 파일: 라디오 자리 ✕ · 흐린 줄 · [삭제]만. 삭제는 늘 확인 창. 실패는 줄 아래 한 줄.
export function DocumentRow({ document, flash, nextActive }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editError, setEditError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 링크는 제목 · 주소를 같이 고침(펼침 칸)
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);
  const [linkError, setLinkError] = useState<LinkError | null>(null);
  const submittedCount = document.submittedCount ?? 0;

  const isLink = document.kind === 'link';
  // 파일 kind인데 storagePath가 없으면 올리다 멈춘 row로 취급 — 지우기만 가능.
  const isOrphan = !isLink && !document.storagePath;

  function handleSelectActive() {
    if (document.isActive) return; // 이미 대표
    setError(null);
    startTransition(async () => {
      try {
        await patchDocument(document.id, { isActive: true });
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('대표로 바꾸지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function cancelEdit() {
    setEditTitle(null);
    setEditError(false);
    setError(null);
  }

  function saveTitle() {
    if (editTitle === null) return;
    const t = editTitle.trim();
    if (!t) {
      setEditError(true);
      setError('이름을 입력하세요.');
      return;
    }
    if (t === document.title) {
      cancelEdit();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await patchDocument(document.id, { title: t });
        cancelEdit();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('이름을 바꾸지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function saveLink() {
    if (!linkDraft) return;
    const t = linkDraft.title.trim();
    const u = linkDraft.url.trim();
    if (!t) {
      setLinkError({ field: 'title', message: '이름을 입력하세요.' });
      return;
    }
    if (!/^https?:\/\/.+/i.test(u)) {
      setLinkError({ field: 'url', message: '주소는 http:// 또는 https://로 시작해야 해요.' });
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await patchDocument(document.id, { title: t, url: u });
        setLinkDraft(null);
        setLinkError(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('고치지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteDocument(document.id);
        // 대표를 지웠으면 가장 최근 파일을 대표로 — 채용 리스트 제출본 자동 기록이 대표를 씀
        if (document.isActive && nextActive) {
          await patchDocument(nextActive.id, { isActive: true }).catch((e) => console.error(e));
        }
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setConfirmOpen(false);
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  async function handleOpen() {
    setError(null);
    if (isLink && document.url) {
      window.open(document.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloading(true);
    try {
      // 파일을 받아서 "제목.pdf"로 저장 — 저장소 주소로 바로 열면 이름이 내부 id(…uuid.pdf)가 되고,
      // 저장소의 이름 지정 옵션은 한글 이름을 %ED%… 로 깨뜨려서 브라우저에서 이름을 붙임
      const { url } = await getDocumentDownloadUrl(document.id);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const href = URL.createObjectURL(await res.blob());
      const a = window.document.createElement('a');
      a.href = href;
      a.download = downloadFileName(document.title);
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (err) {
      console.error(err);
      setError('다운로드하지 못했어요. 잠시 후 다시 해보세요.');
    } finally {
      setDownloading(false);
    }
  }

  const lead = isLink ? null : isOrphan ? (
    <span className="-ml-2.5 inline-flex h-10 w-10 shrink-0 items-center justify-center" title="대표로 고를 수 없어요">
      <X className="h-4 w-4 text-icon-faint" aria-hidden />
    </span>
  ) : (
    <label className={RADIO_LABEL}>
      <input
        type="radio"
        name={`active-${document.kind}`}
        checked={document.isActive}
        onChange={handleSelectActive}
        // 저장 중에도 disabled로 막지 않음 — 막으면 포커스가 빠져서 방향키로 이어서 고를 수 없음.
        // 이미 대표인 줄은 handleSelectActive가 무시하고, 마지막 PATCH가 이김(서버가 같은 종류의 다른 대표를 끔).
        aria-busy={pending || undefined}
        aria-label={`${document.title} 대표로 정하기`}
        className={RADIO}
      />
    </label>
  );

  const sub = isLink
    ? null
    : `PDF · ${formatSize(document.fileSize)}${isOrphan ? ' · 지우고 다시 올려주세요' : ''}`;

  return (
    <li>
      <div
        className={`-mx-3 flex min-h-14 items-center gap-3 rounded-md px-3 py-2 hover:bg-row-hover ${
          flash ? 'animate-[row-flash_2.5s_ease-out] motion-reduce:animate-none' : ''
        }`}
      >
        {lead}

        {editTitle !== null ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setEditError(false);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') cancelEdit();
              }}
              maxLength={200}
              disabled={pending}
              autoFocus
              aria-label={`${document.title} 이름`}
              aria-invalid={editError}
              className={`${POPOVER_INPUT_BASE} mr-1 flex-1 text-[15px] ${editError ? INPUT_ERROR : ''}`}
            />
            <button
              type="button"
              onClick={saveTitle}
              disabled={pending}
              aria-label="저장 (Enter)"
              title="저장 (Enter)"
              aria-keyshortcuts="Enter"
              className={`${BUTTON_PRIMARY} h-10 w-10 px-0!`}
            >
              <Check className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              aria-label="취소 (Esc)"
              title="취소 (Esc)"
              aria-keyshortcuts="Escape"
              className={`${ROW_ACTION} -mr-1.5`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                {isLink || isOrphan ? (
                  <span
                    className={`max-w-95 truncate text-[15px] font-semibold ${isOrphan ? 'text-ink-faint' : 'text-ink-strong'}`}
                  >
                    {document.title}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    title="미리보기"
                    aria-label={`${document.title} 미리보기`}
                    className="max-w-95 cursor-pointer truncate rounded-sm text-left text-[15px] font-semibold text-ink-strong underline-offset-3 outline-none hover:underline focus-visible:underline focus-visible:shadow-[0_0_0_2px_var(--rally-chip-on-border)]"
                  >
                    {document.title}
                  </button>
                )}
                {document.isActive && !isLink && !isOrphan ? <StatusBadge filled>대표</StatusBadge> : null}
                {isOrphan ? <StatusBadge>올리다 멈춤</StatusBadge> : null}
                {submittedCount > 0 ? <StatusBadge>{submittedCount}곳 제출</StatusBadge> : null}
              </span>
              {isLink ? (
                <span className="block max-w-110 truncate font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12.5px] text-ink-muted">
                  {document.url}
                </span>
              ) : (
                <span className={`text-[13px] ${isOrphan ? 'text-icon-faint' : 'text-ink-muted'}`}>{sub}</span>
              )}
            </div>

            <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
              {isOrphan ? null : (
                <RowAction
                  label={isLink ? `${document.title} 새 탭에서 열기` : `${document.title} 다운로드`}
                  title={isLink ? '새 탭에서 열기' : '다운로드'}
                  onClick={handleOpen}
                  disabled={downloading}
                >
                  {isLink ? <ExternalLink className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                </RowAction>
              )}
              {isOrphan ? null : (
                <RowAction
                  label={isLink ? `${document.title} 이름 · 주소 고치기` : `${document.title} 이름 고치기`}
                  title={isLink ? '이름 · 주소 고치기' : '이름 고치기'}
                  onClick={() => {
                    setError(null);
                    if (isLink) {
                      setLinkDraft(linkDraft ? null : { title: document.title, url: document.url ?? '' });
                      setLinkError(null);
                    } else setEditTitle(document.title);
                  }}
                  aria-expanded={isLink ? !!linkDraft : undefined}
                  disabled={pending}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </RowAction>
              )}
              <RowAction
                label={`${document.title} 삭제`}
                title="삭제"
                onClick={() => {
                  setError(null);
                  setConfirmOpen(true);
                }}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </RowAction>
            </div>
          </>
        )}
      </div>

      {isLink && linkDraft ? (
        <ExpandPanel>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 md:grid-cols-[1fr_1.6fr]">
            <Field label="이름" error={linkError?.field === 'title' ? linkError.message : null}>
              <input
                type="text"
                value={linkDraft.title}
                onChange={(e) => {
                  setLinkDraft({ ...linkDraft, title: e.target.value });
                  setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveLink();
                  if (e.key === 'Escape') setLinkDraft(null);
                }}
                maxLength={200}
                autoFocus
                disabled={pending}
                aria-invalid={linkError?.field === 'title'}
                className={`${POPOVER_INPUT} text-[15px] ${linkError?.field === 'title' ? INPUT_ERROR : ''}`}
              />
            </Field>
            <Field label="주소" error={linkError?.field === 'url' ? linkError.message : null}>
              <input
                type="url"
                value={linkDraft.url}
                onChange={(e) => {
                  setLinkDraft({ ...linkDraft, url: e.target.value });
                  setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveLink();
                  if (e.key === 'Escape') setLinkDraft(null);
                }}
                maxLength={1000}
                disabled={pending}
                aria-invalid={linkError?.field === 'url'}
                className={`${POPOVER_INPUT} font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[13.5px] ${linkError?.field === 'url' ? INPUT_ERROR : ''}`}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLinkDraft(null)} disabled={pending} className={BUTTON_SECONDARY}>
              취소
            </button>
            <button type="button" onClick={saveLink} disabled={pending} className={BUTTON_PRIMARY}>
              {pending ? '저장 중…' : '저장'}
            </button>
          </div>
        </ExpandPanel>
      ) : null}

      {error ? (
        <p role="alert" className={`pb-2 text-[13px] text-alert ${isLink ? '' : 'pl-10.5'}`}>
          {error}
        </p>
      ) : null}

      {previewOpen ? (
        <DocumentPreviewModal
          documentId={document.id}
          title={document.title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      <ListConfirmDialog
        open={confirmOpen}
        title={deleteConfirmTitle(shorten(document.title))}
        widthClass="md:max-w-130"
        body={
          isLink ? (
            '목록에서 지워져요. 되돌릴 수 없어요.'
          ) : (
            <>
              파일이 영구히 지워져요. 되돌릴 수 없어요.
              {submittedCount > 0 ? (
                <>
                  <br />
                  {submittedCount}곳에 제출했어요. 지우면 그 회사들의 제출 기록에서도 빠져요.
                </>
              ) : null}
              {document.isActive && nextActive ? (
                <>
                  <br />
                  {nextActiveSentence(shorten(nextActive.title, 30))}
                </>
              ) : null}
            </>
          )
        }
        confirmLabel={pending ? '삭제 중…' : '삭제'}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}
