'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export type Placement = 'below' | 'above';

export interface PopoverPosition {
  top: number;
  left: number;
  placement: Placement;
}

export function usePopoverPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  estimatedHeight: number,
  popoverWidth: number,
): PopoverPosition | null {
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function compute() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: Placement =
        spaceBelow < estimatedHeight + margin ? 'above' : 'below';
      const top =
        placement === 'above'
          ? Math.max(margin, rect.top - estimatedHeight - 4)
          : rect.bottom + 4;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - margin) {
        left = window.innerWidth - popoverWidth - margin;
      }
      if (left < margin) left = margin;
      setPos({ top, left, placement });
    }
    compute();
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [open, anchorRef, estimatedHeight, popoverWidth]);

  // Derive to null while closed instead of calling setPos(null) in the effect
  // (react-hooks/set-state-in-effect). Stale pos from the previous open cycle
  // stays in state but never leaks to callers, and the next open's
  // useLayoutEffect overwrites it synchronously before paint.
  return open ? pos : null;
}

// usePopoverPosition은 추정 높이로 위/아래를 정해서, 실제 팝오버가 그보다
// 낮으면 위로 뜰 때 앵커와 벌어짐. 팝오버 Body에서 호출해 마운트 후 실제
// 높이로 앵커에 다시 붙인 top을 돌려줌 (측정 전엔 fallbackTop). Select의
// 재측정 로직과 같은 기준.
export function useMeasuredTop(
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  fallbackTop: number,
): number {
  const [measuredTop, setMeasuredTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    function recompute() {
      const popEl = popoverRef.current;
      const anchorEl = anchorRef.current;
      if (!popEl || !anchorEl) return;
      const popH = popEl.getBoundingClientRect().height;
      const a = anchorEl.getBoundingClientRect();
      const margin = 16;
      setMeasuredTop(
        window.innerHeight - a.bottom >= popH + margin
          ? a.bottom + 4
          : Math.max(margin, a.top - popH - 4),
      );
    }
    recompute();
    // 열린 뒤 내용이 바뀌어 높이가 변해도(에러 문구 등) 다시 붙임.
    const ro = popoverRef.current ? new ResizeObserver(recompute) : null;
    if (ro && popoverRef.current) ro.observe(popoverRef.current);
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [anchorRef, popoverRef]);

  return measuredTop ?? fallbackTop;
}
