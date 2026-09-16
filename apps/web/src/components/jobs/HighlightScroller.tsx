'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Scrolls the highlighted row into view on mount, then strips ?highlight=
// from the URL so refresh / back navigation doesn't re-scroll or keep the
// visual emphasis stuck on.
export function HighlightScroller() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlight = searchParams.get('highlight');

  useEffect(() => {
    if (!highlight) return;
    // JobsTable(md:block) and JobsCards(md:hidden) both render rows with
    // the same data-cid, but only one is visually laid out. Pick whichever
    // is currently non-zero-sized.
    const els = document.querySelectorAll<HTMLElement>(
      `[data-cid="${highlight}"]`,
    );
    for (const el of els) {
      if (el.getBoundingClientRect().width > 0) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
    }

    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('highlight');
      const qs = next.toString();
      router.replace(qs ? `/jobs?${qs}` : '/jobs', { scroll: false });
    }, 2500);
    return () => clearTimeout(t);
  }, [highlight, router, searchParams]);

  return null;
}
