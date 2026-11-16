'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { patchCompany } from '../../../lib/api';
import { TABLE_TRIGGER } from './table-style';

// 채용 표(데스크톱) 채용여부 칸 — "채용중" / "—" 글자 스위치. 모바일 카드는 바텀시트 토글(mobile/MobileJobCard).
export function HiringToggle({ id, value }: { id: string; value: boolean }) {
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
      role="switch"
      onClick={toggle}
      aria-checked={current}
      aria-label="채용중"
      className={`${TABLE_TRIGGER} text-sm ${current ? 'text-ink-soft' : 'text-icon-faint'}`}
    >
      {current ? '채용중' : '—'}
    </button>
  );
}
