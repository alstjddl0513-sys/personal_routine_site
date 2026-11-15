'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, FileText, X } from 'lucide-react';
import type { Document } from '@repo/shared';
import { getDocumentDownloadUrl, patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';
import {
  POPOVER_CARD,
  POPOVER_CLOSE,
  POPOVER_EDGE_MARGIN,
  POPOVER_TITLE,
} from './popover-style';
import { TABLE_ICON_BUTTON } from './table-style';

const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 340;

type Slot = 'resumeDocumentId' | 'portfolioDocumentId';
type Linked = Record<Slot, string | null>;

// 이 회사에 낸 이력서/포폴 버전. 지원상태가 처음 '지원' 이후로 바뀌면 서버가
// 그때 대표 문서를 자동으로 채우고, 여기서 직접 바꾸거나 뺄 수 있음.
//
// 팝오버 안에서 Select를 쓰면 Select 드롭다운(Portal)이 바깥 클릭으로
// 잡혀 팝오버가 닫혀서, 문서 목록을 버튼 리스트로 바로 노출.
export function SubmittedDocsPopover({
  id,
  resumeDocumentId,
  portfolioDocumentId,
  documents,
  variant,
}: {
  id: string;
  resumeDocumentId: string | null;
  portfolioDocumentId: string | null;
  documents: Document[];
  variant?: 'table';
}) {
  const { linked, count, commit } = useSubmittedDocs(id, resumeDocumentId, portfolioDocumentId);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition(
    anchorRef,
    open,
    POPOVER_HEIGHT,
    POPOVER_WIDTH,
    POPOVER_EDGE_MARGIN,
  );

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'table'
            ? `${TABLE_ICON_BUTTON} hover:bg-row-hover ${count > 0 ? 'text-ink-soft' : 'text-icon-faint'}`
            : `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                count > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`
        }
        aria-label={count > 0 ? `제출본 ${count}개` : '제출본 연결'}
        aria-expanded={open}
      >
        <FileText
          className={variant === 'table' ? 'h-3.75 w-3.75' : 'h-3.5 w-3.5'}
          strokeWidth={variant === 'table' ? 1.8 : undefined}
          aria-hidden
        />
        {count > 0 ? <span>{count}</span> : null}
      </button>
      {open && pos ? (
        <Portal>
          <Body top={pos.top} left={pos.left} anchorRef={anchorRef} popoverRef={popoverRef}>
            <SubmittedDocsEditor
              linked={linked}
              count={count}
              documents={documents}
              onCommit={commit}
              onClose={() => setOpen(false)}
            />
          </Body>
        </Portal>
      ) : null}
    </>
  );
}

// 제출본 연결 상태 + 슬롯 변경(즉시 저장, optimistic). 팝오버와 사이드 패널이 같이 씀.
export function useSubmittedDocs(
  id: string,
  resumeDocumentId: string | null,
  portfolioDocumentId: string | null,
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [linked, setLinked] = useOptimistic<Linked, Partial<Linked>>(
    { resumeDocumentId, portfolioDocumentId },
    (state, patch) => ({ ...state, ...patch }),
  );

  function commit(slot: Slot, next: string | null) {
    if (linked[slot] === next) return;
    startTransition(async () => {
      setLinked({ [slot]: next });
      try {
        await patchCompany(id, { [slot]: next });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const count =
    (linked.resumeDocumentId ? 1 : 0) + (linked.portfolioDocumentId ? 1 : 0);
  return { linked, count, commit };
}

function Body({
  top,
  left,
  anchorRef,
  popoverRef,
  children,
}: {
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  // 문서 수에 따라 높이가 달라서 실제 높이로 버튼에 다시 붙임.
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);
  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: measuredTop,
        left,
        width: POPOVER_WIDTH,
        zIndex: 50,
      }}
      className={`${POPOVER_CARD} max-h-96 overflow-y-auto`}
    >
      {children}
    </div>
  );
}

// 제출본 고르기 — 팝오버와 사이드 패널(CompanyDetailPanel)이 같이 씀.
// 고르는 즉시 저장이라 버릴 초안이 없어서 [취소] 대신 제목 줄 ✕ (onClose 없으면 숨김).
export function SubmittedDocsEditor({
  linked,
  count,
  documents,
  onCommit,
  onClose,
}: {
  linked: Linked;
  count: number;
  documents: Document[];
  onCommit: (slot: Slot, next: string | null) => void;
  onClose?: () => void;
}) {
  // 업로드 미완료(orphan) 파일은 열 수 없으니 후보에서 제외.
  const usable = documents.filter((d) => d.kind === 'link' || d.storagePath);
  const resumes = usable.filter((d) => d.kind === 'resume');
  const portfolios = usable.filter(
    (d) => d.kind === 'portfolio' || d.kind === 'link',
  );

  return (
    <>
      <div className={`flex items-center justify-between gap-2 ${onClose ? '-my-2' : ''}`}>
        <span className={POPOVER_TITLE}>이 회사에 낸 문서 {count}개</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className={POPOVER_CLOSE}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {usable.length === 0 ? (
        <p className="text-sm text-ink-muted">
          이력서·포트폴리오를 먼저 올려두면 여기서 고를 수 있어요.{' '}
          <Link href="/settings/documents" className="font-medium text-heading hover:underline">
            올리러 가기
          </Link>
        </p>
      ) : (
        <>
          <SlotList
            label="이력서"
            options={resumes}
            selectedId={linked.resumeDocumentId}
            onSelect={(next) => onCommit('resumeDocumentId', next)}
          />
          <SlotList
            label="포트폴리오"
            options={portfolios}
            selectedId={linked.portfolioDocumentId}
            onSelect={(next) => onCommit('portfolioDocumentId', next)}
          />
        </>
      )}
      <span className="text-[13px] text-ink-muted">
        지원상태를 &lsquo;지원&rsquo;으로 바꾸면 그때 대표 문서가 여기 자동으로 담겨요.
      </span>
    </>
  );
}

function SlotList({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: Document[];
  selectedId: string | null;
  onSelect: (next: string | null) => void;
}) {
  return (
    <section>
      <h3 className="mb-0.5 text-xs font-semibold text-ink-soft">{label}</h3>
      {options.length === 0 ? (
        <p className="text-sm text-ink-muted">올린 {label}가 없어요.</p>
      ) : (
        <ul className="flex flex-col">
          <Option
            title="내지 않음"
            selected={selectedId === null}
            onSelect={() => onSelect(null)}
          />
          {options.map((d) => (
            <Option
              key={d.id}
              document={d}
              title={d.title}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Option({
  document,
  title,
  selected,
  onSelect,
}: {
  document?: Document;
  title: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    if (!document) return;
    if (document.kind === 'link' && document.url) {
      window.open(document.url, '_blank', 'noopener,noreferrer');
      return;
    }
    // 서명 URL을 await한 뒤 window.open하면 클릭 제스처가 끝나 iOS Safari 등에서
    // 팝업이 막힘 → 클릭 즉시 빈 창부터 열고 URL은 나중에 채움.
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    setOpening(true);
    try {
      const { url } = await getDocumentDownloadUrl(document.id);
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      win?.close();
      console.error(err);
    } finally {
      setOpening(false);
    }
  }

  const uploaded = document ? new Date(document.createdAt) : null;
  const meta = document
    ? [
        uploaded && !isNaN(uploaded.getTime())
          ? `${String(uploaded.getMonth() + 1).padStart(2, '0')}.${String(uploaded.getDate()).padStart(2, '0')} ${document.kind === 'link' ? '추가' : '업로드'}`
          : null,
        document.isActive ? '대표' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <li className="flex min-h-11 items-center gap-2.5 border-b border-divider last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
      >
        <span
          aria-hidden
          className={`flex h-4.5 w-4.5 flex-none items-center justify-center rounded border ${
            selected ? 'border-primary bg-primary text-surface' : 'border-btn-border'
          }`}
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={`truncate text-sm ${document ? 'text-ink' : 'text-ink-muted'}`}>
            {title}
          </span>
          {meta ? <span className="text-xs text-ink-muted">{meta}</span> : null}
        </span>
      </button>
      {document ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={opening}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center px-1 text-sm font-medium text-heading hover:underline disabled:opacity-40"
        >
          열기
        </button>
      ) : null}
    </li>
  );
}
