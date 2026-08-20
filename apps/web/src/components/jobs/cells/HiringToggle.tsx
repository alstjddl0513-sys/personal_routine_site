'use client';

import { useEffect, useState, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  function toggle() {
    const prev = current;
    const next = !current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await patchCompany(id, { isHiring: next });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
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
