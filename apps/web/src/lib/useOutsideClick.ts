'use client';

import { useEffect, type RefObject } from 'react';

type ElementRef = RefObject<HTMLElement | null>;

export function useOutsideClick(
  refOrRefs: ElementRef | ElementRef[],
  handler: (e: MouseEvent | TouchEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];
    function listener(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      for (const r of refs) {
        if (r.current?.contains(target)) return;
      }
      handler(e);
    }
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refOrRefs, handler, enabled]);
}
