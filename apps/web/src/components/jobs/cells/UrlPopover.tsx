'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';

const POPOVER_WIDTH = 320; // w-80
const POPOVER_HEIGHT = 170;

export function UrlPopover({
  id,
  value,
}: {
  id: string;
  value: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pos = usePopoverPosition(anchorRef, open, POPOVER_HEIGHT, POPOVER_WIDTH);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

  useEffect(() => {
    if (open) {
      setDraft(current ?? '');
      setError(null);
      setCopied(false);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open, current]);

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function save() {
    const trimmed = draft.trim();
    const next: string | null = trimmed === '' ? null : trimmed;
    if (next !== null) {
      try {
        const u = new URL(next);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setError('http:// 또는 https:// URL만 가능');
          return;
        }
      } catch {
        setError('올바른 URL 형식이 아닙니다');
        return;
      }
    }
    if (next === current) {
      setOpen(false);
      return;
    }
    const prev = current;
    setCurrent(next);
    setOpen(false);
    startTransition(async () => {
      try {
        await patchCompany(id, { postingUrl: next });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
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
      {mounted && open && pos
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: POPOVER_WIDTH,
                zIndex: 50,
              }}
              className="rounded-md border border-zinc-200 bg-white p-2 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="url"
                  value={draft}
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
                  className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                {draft ? (
                  <button
                    type="button"
                    onClick={() => setDraft('')}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                    aria-label="비우기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {error ? (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-1">
                {current ? (
                  <button
                    type="button"
                    onClick={copyUrl}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                      copied
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" aria-hidden />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden />
                        주소 복사
                      </>
                    )}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={isPending}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
