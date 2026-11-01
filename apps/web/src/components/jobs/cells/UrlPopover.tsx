'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
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
          initialUrl={current}
          current={current}
          isPending={isPending}
          top={pos.top}
          left={pos.left}
          anchorRef={anchorRef}
          popoverRef={popoverRef}
          onCommit={commit}
          onCancel={() => setOpen(false)}
        />
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

interface BodyProps {
  initialUrl: string | null;
  current: string | null;
  isPending: boolean;
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCommit: (next: string | null) => void;
  onCancel: () => void;
}

// docs/design/rally-jobs-parts.html '공고 링크'. 시안엔 저장·취소 버튼이 없지만
// 저장 방식(명시적 저장·Enter)은 그대로 유지.
function UrlPopoverBody({
  initialUrl,
  current,
  isPending,
  top,
  left,
  anchorRef,
  popoverRef,
  onCommit,
  onCancel,
}: BodyProps) {
  // 에러 문구·버튼 유무로 높이가 달라져서 실제 높이로 버튼에 붙임.
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);
  const [draft, setDraft] = useState(initialUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

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
      <label htmlFor="posting-url" className={POPOVER_TITLE}>
        공고 링크
      </label>
      <div className="flex flex-col gap-1.5">
        <input
          id="posting-url"
          ref={inputRef}
          type="url"
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'posting-url-error' : undefined}
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
          <span id="posting-url-error" className="text-[13px] text-alert">
            {error}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {current ? (
          <>
            <a href={current} target="_blank" rel="noreferrer" className={BUTTON_SECONDARY}>
              공고 열기 ↗
            </a>
            <button type="button" onClick={copyUrl} className={BUTTON_SECONDARY}>
              {copied ? '복사됨' : '주소 복사'}
            </button>
          </>
        ) : null}
        {draft ? (
          <button type="button" onClick={() => setDraft('')} className={BUTTON_TEXT}>
            비우기
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className={BUTTON_SECONDARY}>
            취소
          </button>
          <button type="button" onClick={save} disabled={isPending} className={BUTTON_PRIMARY}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
