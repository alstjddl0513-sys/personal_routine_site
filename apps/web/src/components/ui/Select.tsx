'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { usePopoverPosition } from '../../lib/usePopoverPosition';
import { Portal } from './Portal';

export interface SelectOption {
  value: string;
  label: string;
  /** Applied to both the option row and the trigger (when this option is selected). */
  className?: string;
  disabled?: boolean;
  /** Shown before the label in both the option row and the trigger (e.g. a status dot). */
  icon?: ReactNode;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  /** Extra class merged onto the trigger button. */
  triggerClassName?: string;
  /** Shown when `value` doesn't match any option (defaults to empty string). */
  placeholder?: string;
  /** Rendered after the label inside the trigger (e.g. a hover-only ▾). */
  triggerSuffix?: ReactNode;
}

const POPOVER_MAX_HEIGHT = 288; // max-h-72
// Only used to feed `usePopoverPosition` for right-edge clamping. Actual
// popover width follows content (see style below) with `minWidth` = trigger.
const POSITION_HINT_WIDTH = 200;

// 커스텀 드롭다운(트리거 모양은 쓰는 쪽이 triggerClassName으로). 목록 창은 --rally-* 토큰 한 가지.
export function Select({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
  id,
  triggerClassName,
  placeholder,
  triggerSuffix,
}: Props) {
  const [open, setOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  // usePopoverPosition uses estimated max-height/hint-width, so pos.top can
  // land far above the anchor when the actual popover is shorter (e.g. 3
  // options), and pos.left can be off when the actual popover is narrower.
  // We re-measure after mount and override both.
  const [pxPos, setPxPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const selectedOption = options.find((o) => o.value === value);

  const pos = usePopoverPosition(
    anchorRef,
    open,
    POPOVER_MAX_HEIGHT,
    POSITION_HINT_WIDTH,
  );

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

  // Measure trigger width once opened so the popover matches its width.
  useEffect(() => {
    if (open && anchorRef.current) {
      const w = anchorRef.current.getBoundingClientRect().width;
      if (w > 0) setTriggerWidth(w);
    } else if (!open) {
      setPxPos(null);
    }
  }, [open]);

  // After the popover mounts, measure its actual size and re-anchor both
  // top and left against the trigger. Also re-run on scroll/resize so the
  // popover follows the anchor if the page moves while it's open.
  useLayoutEffect(() => {
    if (!open || !pos) return;
    function recompute() {
      const popEl = popoverRef.current;
      const anchorEl = anchorRef.current;
      if (!popEl || !anchorEl) return;
      const popRect = popEl.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const margin = 16;
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const top =
        spaceBelow >= popRect.height + margin
          ? anchorRect.bottom + 4
          : Math.max(margin, anchorRect.top - popRect.height - 4);
      let left = anchorRect.left;
      if (left + popRect.width > window.innerWidth - margin) {
        left = anchorRect.right - popRect.width;
      }
      if (left < margin) left = margin;
      setPxPos({ top, left });
    }
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [open, pos]);

  // Scroll highlighted option into view.
  useEffect(() => {
    if (!open) return;
    const el = optionRefs.current[highlightIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightIdx]);

  function computeInitialHighlight(): number {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) return idx;
    return options.findIndex((o) => !o.disabled);
  }

  function openPopover() {
    if (disabled) return;
    setHighlightIdx(computeInitialHighlight());
    setOpen(true);
  }

  function commitAndClose(next: string) {
    if (next !== value) onChange(next);
    setOpen(false);
    anchorRef.current?.focus();
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // 팝오버가 이미 열려 있을 땐 아무것도 하지 않는다 — document keydown
      // 리스너가 하이라이트 이동/커밋을 처리. 여기서 openPopover를 다시
      // 부르면 setHighlightIdx(initial)가 매 press마다 발화하며 리스너의
      // setHighlightIdx(prev + 1)와 같은 batch에 섞여 진동/멈춤을 만듦.
      if (!open) openPopover();
    }
  }

  useEffect(() => {
    if (!open) return;
    // Handler is defined inside the effect so eslint can see all deps
    // directly (previously it was extracted and `exhaustive-deps` couldn't
    // trace through the function call).
    function listener(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        anchorRef.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (options.length === 0) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        let i = highlightIdx;
        for (let step = 0; step < options.length; step++) {
          i = (i + delta + options.length) % options.length;
          if (!options[i].disabled) {
            setHighlightIdx(i);
            return;
          }
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        const first = options.findIndex((o) => !o.disabled);
        if (first >= 0) setHighlightIdx(first);
      } else if (e.key === 'End') {
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            setHighlightIdx(i);
            return;
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[highlightIdx];
        if (opt && !opt.disabled) {
          if (opt.value !== value) onChange(opt.value);
          setOpen(false);
          anchorRef.current?.focus();
        }
      } else if (e.key === 'Tab') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [open, highlightIdx, options, value, onChange]);

  const triggerClass = [
    'inline-flex items-center justify-center gap-1',
    triggerClassName ?? '',
    selectedOption?.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass}
      >
        {selectedOption?.icon}
        <span className="truncate">
          {selectedOption?.label ?? placeholder ?? ''}
        </span>
        {triggerSuffix}
      </button>

      {open && pos ? (
        <Portal>
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: pxPos?.top ?? pos.top,
              left: pxPos?.left ?? pos.left,
              minWidth: triggerWidth || undefined,
              maxWidth: '90vw',
              zIndex: 50,
              // Hide until we've re-measured with actual size to avoid a
              // one-frame flash at the (usually wrong) estimated position.
              visibility: pxPos ? 'visible' : 'hidden',
            }}
            className="thin-scrollbar max-h-72 w-max overflow-y-auto rounded-lg border border-line bg-surface p-1.5 font-plex text-ink shadow-[0_12px_28px_rgba(28,31,29,0.12)]"
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={
              options[highlightIdx]
                ? `${id ?? 'select'}-opt-${options[highlightIdx].value}`
                : undefined
            }
            tabIndex={-1}
          >
            {options.map((opt, idx) => renderOption(opt, idx))}
          </div>
        </Portal>
      ) : null}
    </>
  );

  function renderOption(opt: SelectOption, idx: number) {
    const selected = opt.value === value;
    const highlighted = idx === highlightIdx;
    return (
      <li
        key={opt.value}
        id={`${id ?? 'select'}-opt-${opt.value}`}
        ref={(el) => {
          optionRefs.current[idx] = el;
        }}
        role="option"
        aria-selected={selected}
        aria-disabled={opt.disabled || undefined}
        onMouseEnter={() => !opt.disabled && setHighlightIdx(idx)}
        onClick={() => !opt.disabled && commitAndClose(opt.value)}
        className={`flex min-h-8.5 cursor-pointer items-center gap-2.5 rounded px-2.5 text-sm ${
          opt.disabled ? 'cursor-not-allowed opacity-40' : ''
        } ${selected ? 'font-medium' : ''} ${opt.className ?? ''} ${
          highlighted && !opt.disabled ? 'bg-row-hover' : ''
        }`}
      >
        {opt.icon}
        {opt.label}
      </li>
    );
  }
}
