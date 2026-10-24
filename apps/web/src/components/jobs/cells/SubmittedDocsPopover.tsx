'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, FileText } from 'lucide-react';
import type { Document } from '@repo/shared';
import { getDocumentDownloadUrl, patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';

const POPOVER_WIDTH = 288; // w-72
const POPOVER_HEIGHT = 320;

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
}: {
  id: string;
  resumeDocumentId: string | null;
  portfolioDocumentId: string | null;
  documents: Document[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [linked, setLinked] = useOptimistic<Linked, Partial<Linked>>(
    { resumeDocumentId, portfolioDocumentId },
    (state, patch) => ({ ...state, ...patch }),
  );
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition(anchorRef, open, POPOVER_HEIGHT, POPOVER_WIDTH);

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          count > 0
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-zinc-400 dark:text-zinc-600'
        }`}
        aria-label={count > 0 ? `제출본 ${count}개` : '제출본 연결'}
        aria-expanded={open}
      >
        <FileText className="h-3.5 w-3.5" aria-hidden />
        {count > 0 ? count : null}
      </button>
      {open && pos ? (
        <Portal>
          <Body
            top={pos.top}
            left={pos.left}
            anchorRef={anchorRef}
            popoverRef={popoverRef}
            linked={linked}
            documents={documents}
            onCommit={commit}
          />
        </Portal>
      ) : null}
    </>
  );
}

interface BodyProps {
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  linked: Linked;
  documents: Document[];
  onCommit: (slot: Slot, next: string | null) => void;
}

function Body({
  top,
  left,
  anchorRef,
  popoverRef,
  linked,
  documents,
  onCommit,
}: BodyProps) {
  // 문서 수에 따라 높이가 달라서 실제 높이로 버튼에 다시 붙임.
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);

  // 업로드 미완료(orphan) 파일은 열 수 없으니 후보에서 제외.
  const usable = documents.filter((d) => d.kind === 'link' || d.storagePath);
  const resumes = usable.filter((d) => d.kind === 'resume');
  const portfolios = usable.filter(
    (d) => d.kind === 'portfolio' || d.kind === 'link',
  );

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
      className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      {usable.length === 0 ? (
        <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
          이력서·포폴을 먼저 올려두면 여기서 고를 수 있어요.{' '}
          <Link
            href="/settings/documents"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
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
    </div>
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
      <h3 className="mb-1 px-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </h3>
      {options.length === 0 ? (
        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-600">
          올린 {label}가 없어요.
        </p>
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
    setOpening(true);
    try {
      const { url } = await getDocumentDownloadUrl(document.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
    } finally {
      setOpening(false);
    }
  }

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
          selected
            ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
        } ${document ? '' : 'text-zinc-500 dark:text-zinc-500'}`}
      >
        <Check
          className={`h-3 w-3 shrink-0 ${selected ? '' : 'invisible'}`}
          aria-hidden
        />
        <span className="truncate">{title}</span>
        {document?.kind === 'link' ? (
          <span className="shrink-0 text-[10px] text-zinc-400">링크</span>
        ) : null}
        {document?.isActive ? (
          <span className="shrink-0 rounded bg-blue-100 px-1 text-[10px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            대표
          </span>
        ) : null}
      </button>
      {document ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={opening}
          title="열기"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}
