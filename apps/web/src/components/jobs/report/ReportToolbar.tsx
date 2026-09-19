'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

// 인쇄용이 아니라 화면에서만 노출되는 조작 툴바. print CSS로 숨김.
// 기간 프리셋(from/to)과 상태 필터(includeAll)를 URL로 반영.

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function threeMonthsAgoIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yearStartIso(): string {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

export function ReportToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(mutator: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    router.push(`/jobs/report${next.size ? `?${next.toString()}` : ''}`);
  }

  const includeAll = searchParams.get('includeAll') === '1';

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 py-3 print:hidden dark:border-zinc-800"
      data-toolbar
    >
      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={`/jobs${searchParams.size ? `?${searchParams.toString()}` : ''}`}
          className="mr-1 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> 채용 리스트
        </Link>
        <span className="mx-1 text-xs text-zinc-400">·</span>
        <PresetButton
          label="최근 3개월"
          onClick={() =>
            updateParams((p) => {
              p.set('from', threeMonthsAgoIso());
              p.set('to', todayIso());
            })
          }
        />
        <PresetButton
          label="이번 년도"
          onClick={() =>
            updateParams((p) => {
              p.set('from', yearStartIso());
              p.set('to', todayIso());
            })
          }
        />
        <PresetButton
          label="전체"
          onClick={() =>
            updateParams((p) => {
              p.delete('from');
              p.delete('to');
            })
          }
        />
        <span className="mx-1 text-xs text-zinc-400">·</span>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
          <input
            type="checkbox"
            checked={includeAll}
            onChange={(e) =>
              updateParams((p) => {
                if (e.target.checked) p.set('includeAll', '1');
                else p.delete('includeAll');
              })
            }
            className="h-3 w-3"
          />
          미지원·취소 포함
        </label>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden />
        인쇄
      </button>
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {label}
    </button>
  );
}
