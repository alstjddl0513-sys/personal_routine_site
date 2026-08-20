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
    if (!open) {
      setPos(null);
      return;
    }
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

  return pos;
}
