'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export type Placement = 'below' | 'above';

export function usePopoverPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  estimatedHeight = 200,
): Placement {
  const [placement, setPlacement] = useState<Placement>('below');
  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < estimatedHeight ? 'above' : 'below');
  }, [open, anchorRef, estimatedHeight]);
  return placement;
}
