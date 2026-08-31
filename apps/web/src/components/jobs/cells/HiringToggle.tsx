'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { patchCompany } from '../../../lib/api';

export function HiringToggle({
  id,
  value,
}: {
  id: string;
  value: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  // See FavoriteToggle for rationale — protects optimistic state from being
  // clobbered by a router.refresh landing from an earlier click.
  const inFlightRef = useRef(0);

  useEffect(() => {
    if (inFlightRef.current > 0) return;
    setCurrent(value);
  }, [value]);

  function toggle() {
    const prev = current;
    const next = !current;
    setCurrent(next);
    inFlightRef.current++;
    patchCompany(id, { isHiring: next })
      .then(() => {
        router.refresh();
      })
      .catch((err) => {
        console.error(err);
        setCurrent(prev);
      })
      .finally(() => {
        inFlightRef.current--;
      });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={current}
      aria-label={current ? '채용중' : '채용중 아님'}
      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {current ? (
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      )}
    </button>
  );
}
