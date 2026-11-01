'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_TEXT,
  POPOVER_CARD,
  POPOVER_CLOSE,
  POPOVER_EDGE_MARGIN,
  POPOVER_INPUT,
  POPOVER_TITLE,
} from './popover-style';
import { TABLE_ICON_BUTTON } from './table-style';

const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 190;
const URL_ERROR = '주소가 https:// 로 시작하는지 확인해 주세요.';

export function UrlPopover({
  id,
  value,
  variant,
}: {
  id: string;
  value: string | null;
  variant?: 'table';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);
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

  function commit(next: string | null) {
    if (next === current) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      setCurrent(next);
      try {
        await patchCompany(id, { postingUrl: next });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const body =
    open && pos ? (
      <Portal>
        <UrlPopoverBody
          top={pos.top}
          left={pos.left}
          anchorRef={anchorRef}
          popoverRef={popoverRef}
        >
          <UrlEditor
            current={current}
            isPending={isPending}
            onCommit={commit}
            onCancel={() => setOpen(false)}
            revertable
            autoFocus
          />
        </UrlPopoverBody>
      </Portal>
    ) : null;

  // 표: 아이콘 하나 — 열기·복사·편집은 팝오버에서.
  if (variant === 'table') {
    return (
      <>
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={current ? '공고 링크' : '공고 링크 추가'}
          aria-expanded={open}
          className={`${TABLE_ICON_BUTTON} hover:bg-row-hover ${current ? 'text-ink-soft' : 'text-icon-faint'}`}
        >
          <LinkIcon className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
        </button>
        {body}
      </>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {current ? (
        <a
          href={current}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:underline dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          링크
        </a>
      ) : null}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label={current ? '공고 링크 편집' : '공고 링크 추가'}
        aria-expanded={open}
      >
        <LinkIcon className="h-3.5 w-3.5" aria-hidden />
      </button>
      {body}
    </div>
  );
}

function UrlPopoverBody({
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
  // 에러 문구·버튼 유무로 높이가 달라져서 실제 높이로 버튼에 붙임.
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
      className={POPOVER_CARD}
    >
      {children}
    </div>
  );
}

// 공고 링크 편집 내용 — 팝오버와 사이드 패널(CompanyDetailPanel)이 같이 씀.
// docs/design/rally-jobs-parts.html '공고 링크'. 시안엔 저장 버튼이 없지만 저장
// 방식(명시적 저장·Enter)은 그대로 유지.
export function UrlEditor({
  current,
  isPending,
  onCommit,
  onCancel,
  revertable,
  autoFocus,
}: {
  current: string | null;
  isPending: boolean;
  onCommit: (next: string | null) => void;
  /** 팝오버: 제목 줄 ✕ = 닫기. */
  onCancel?: () => void;
  /** 입력을 바꿨을 때만 [되돌리기] = 저장된 값으로 (팝오버·패널 둘 다). */
  revertable?: boolean;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = autoFocus ? 'posting-url-pop' : 'posting-url-panel';

  useEffect(() => {
    if (autoFocus) queueMicrotask(() => inputRef.current?.focus());
  }, [autoFocus]);

  async function copyUrl() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  function save() {
    const trimmed = draft.trim();
    const next: string | null = trimmed === '' ? null : trimmed;
    if (next !== null) {
      try {
        const u = new URL(next);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setError(URL_ERROR);
          return;
        }
      } catch {
        setError(URL_ERROR);
        return;
      }
    }
    onCommit(next);
  }

  return (
    <>
      <div className={`flex items-center justify-between gap-2 ${onCancel ? '-my-2' : ''}`}>
        <label htmlFor={inputId} className={POPOVER_TITLE}>
          공고 링크
        </label>
        {onCancel ? (
          <button type="button" onClick={onCancel} aria-label="닫기" className={POPOVER_CLOSE}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          id={inputId}
          ref={inputRef}
          type="url"
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
          maxLength={1000}
          placeholder="https://..."
          className={`${POPOVER_INPUT} ${error ? 'border-alert focus:border-alert' : ''}`}
        />
        {error ? (
          <span id={`${inputId}-error`} className="text-[13px] text-alert">
            {error}
          </span>
        ) : null}
      </div>
      {/* 저장된 링크 쓰기 — 보조 기능이라 작은 글자 링크로 (아래 [저장]과 안 겹치게). */}
      {current ? (
        <div className="-mt-1 flex items-center gap-2 text-[13px] text-ink-faint">
          <a href={current} target="_blank" rel="noreferrer" className="inline-flex min-h-8 cursor-pointer items-center text-[13px] font-medium text-heading hover:underline">
            공고 열기 ↗
          </a>
          <span aria-hidden>·</span>
          <button type="button" onClick={copyUrl} className="inline-flex min-h-8 cursor-pointer items-center text-[13px] font-medium text-heading hover:underline">
            {copied ? '복사됨' : '주소 복사'}
          </button>
        </div>
      ) : null}
      {/* 아래 줄은 마감일·메모와 같은 배치. 지우기(저장된 링크 바로 삭제)는 [저장]과 떨어뜨려 왼쪽. */}
      <div className="flex items-center justify-between gap-2">
        {current ? (
          <button type="button" onClick={() => onCommit(null)} className={BUTTON_TEXT}>
            지우기
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          {revertable && draft !== (current ?? '') ? (
            <button
              type="button"
              onClick={() => {
                setDraft(current ?? '');
                setError(null);
              }}
              className={BUTTON_SECONDARY}
            >
              되돌리기
            </button>
          ) : null}
          <button type="button" onClick={save} disabled={isPending} className={BUTTON_PRIMARY}>
            저장
          </button>
        </div>
      </div>
    </>
  );
}
