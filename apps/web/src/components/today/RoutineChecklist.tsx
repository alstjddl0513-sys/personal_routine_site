'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleRoutineCheck } from '../../lib/api';
import { ProgressBar } from './Card';

interface Item {
  id: string;
  label: string;
  time: string;
}

// 체크는 optimistic → toggleRoutineCheck → refresh. refresh로 헤더 '아직 체크
// 안 한 루틴' 수·스트릭·챌린지 진행도 서버 값으로 다시 맞춰짐.
export function RoutineChecklist({
  date,
  items,
  initialChecked,
}: {
  date: string;
  items: Item[];
  initialChecked: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic<
    ReadonlySet<string>,
    { id: string; on: boolean }
  >(new Set(initialChecked), (state, { id, on }) => {
    const next = new Set(state);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });

  function toggle(id: string, on: boolean) {
    startTransition(async () => {
      setChecked({ id, on });
      try {
        await toggleRoutineCheck({ blockId: id, date, checked: on });
      } catch (err) {
        console.error(err);
      }
      router.refresh();
    });
  }

  const done = items.filter((i) => checked.has(i.id)).length;

  return (
    <>
      <div className="-mt-1 flex flex-col gap-3">
        <div className="flex justify-end">
          <span className="font-display text-[15px] font-extrabold text-ink">
            {done}
            <span className="font-semibold text-ink-faint"> / {items.length}</span>
          </span>
        </div>
        <ProgressBar pct={items.length ? (done / items.length) * 100 : 0} />
      </div>
      <ul className="flex flex-col">
        {items.map((item) => {
          const on = checked.has(item.id);
          return (
            <li key={item.id}>
              <label className="flex min-h-11.5 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggle(item.id, e.target.checked)}
                  className="h-5 w-5 flex-none accent-primary"
                />
                <span className="w-21.5 flex-none font-display text-[13px] font-semibold text-ink-muted">
                  {item.time}
                </span>
                <span
                  className={
                    on ? 'text-ink-faint line-through' : 'font-medium text-ink'
                  }
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}
