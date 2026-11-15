'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleRoutineCheck } from '../../lib/api';
import { ProgressBar, SectionHead } from './Card';

interface Item {
  id: string;
  label: string;
  time: string;
}

// 체크는 optimistic → toggleRoutineCheck → refresh. refresh로 헤더 '아직 체크
// 안 한 루틴' 수·스트릭·챌린지 진행도 서버 값으로 다시 맞춰짐.
// 제목 줄의 'N / M 완료'가 체크 상태를 따라가야 해서 섹션 제목도 여기서 그림.
export function RoutineChecklist({
  titleId,
  title,
  date,
  items,
  initialChecked,
}: {
  titleId: string;
  title: string;
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
      <SectionHead
        id={titleId}
        title={title}
        aside={
          <span className="text-sm text-ink-soft">
            <strong className="font-semibold text-ink-strong">{done}</strong> / {items.length} 완료
          </span>
        }
      />
      <ProgressBar
        pct={items.length ? (done / items.length) * 100 : 0}
        className="mt-1 h-0.75"
        // 오늘 블록을 전부 체크하면 목표 달성 — 메리골드
        barClassName={items.length > 0 && done === items.length ? 'bg-marigold' : 'bg-primary'}
      />
      <ul className="flex flex-col">
        {items.map((item) => {
          const on = checked.has(item.id);
          return (
            <li key={item.id} className="border-b border-divider">
              <label className="flex min-h-12 cursor-pointer items-center gap-3.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggle(item.id, e.target.checked)}
                  className="h-4.5 w-4.5 flex-none accent-primary"
                />
                <span className="w-24 flex-none text-sm text-ink-muted">{item.time}</span>
                <span className={on ? 'text-ink-faint line-through' : 'text-ink'}>
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
