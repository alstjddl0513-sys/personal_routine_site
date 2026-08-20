'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { patchCompany } from '../../../lib/api';

export function FavoriteToggle({
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
        await patchCompany(id, { isFavorite: next });
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
      aria-label={current ? '즐겨찾기 해제' : '즐겨찾기'}
      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <Heart
        className={`h-4 w-4 ${
          current
            ? 'fill-rose-500 text-rose-500'
            : 'text-zinc-300 dark:text-zinc-600'
        }`}
        aria-hidden
      />
    </button>
  );
}
