'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Printer } from 'lucide-react';
import { Segment } from '../../ui/Segment';
import { BUTTON_PRIMARY } from '../cells/popover-style';

// 인쇄용이 아니라 화면에서만 노출되는 조작 줄. print CSS로 숨김. (docs/design/rally-jobs-report*.html)
// "← 채용 리스트" │ 기간 세그먼트(셋 중 하나만 — 배타 선택이라 칩 아님) │ 미지원 · 지원취소 포함 … [인쇄](유일한 채운 버튼)
// 기간(from/to)과 상태 필터(includeAll)는 URL로 반영.

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

type Preset = '3m' | 'year' | 'all';

// canPrint: 표에 회사가 있을 때만 [인쇄] — "0건"만 찍힌 종이는 쓸 데가 없어서 빈 상태면 막음
export function ReportToolbar({ canPrint }: { canPrint: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(mutator: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    router.push(`/jobs/report${next.size ? `?${next.toString()}` : ''}`);
  }

  const includeAll = searchParams.get('includeAll') === '1';
  // 지금 고른 기간 — 주소의 from/to가 버튼 값과 같으면 선택 모양. 주소로 직접 넣은 기간이면 아무것도 선택 X
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const today = todayIso();
  const activePreset: Preset | '' =
    !from && !to
      ? 'all'
      : to === today && from === threeMonthsAgoIso()
        ? '3m'
        : to === today && from === yearStartIso()
          ? 'year'
          : '';

  function pick(preset: Preset) {
    updateParams((p) => {
      if (preset === 'all') {
        p.delete('from');
        p.delete('to');
      } else {
        p.set('from', preset === '3m' ? threeMonthsAgoIso() : yearStartIso());
        p.set('to', todayIso());
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden" data-toolbar>
      <Link
        href={`/jobs${searchParams.size ? `?${searchParams.toString()}` : ''}`}
        className="-ml-1 inline-flex h-10 items-center gap-1 rounded-md px-1 text-sm text-btn-fg outline-none hover:text-heading focus-visible:shadow-[0_0_0_2px_var(--rally-chip-on-border)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> 채용 리스트
      </Link>
      <span aria-hidden className="h-6 w-px bg-rule" />
      <Segment<Preset | ''>
        label="기간"
        size="lg"
        value={activePreset}
        onChange={(v) => {
          if (v) pick(v);
        }}
        options={[
          { value: '3m', label: '최근 3개월' },
          { value: 'year', label: '올해' },
          { value: 'all', label: '전체' },
        ]}
      />
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-soft">
        <span className="relative inline-flex h-5 w-5 shrink-0">
          <input
            type="checkbox"
            checked={includeAll}
            onChange={(e) =>
              updateParams((p) => {
                if (e.target.checked) p.set('includeAll', '1');
                else p.delete('includeAll');
              })
            }
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-sm border border-btn-border bg-surface outline-none checked:border-primary checked:bg-primary focus-visible:shadow-[0_0_0_2px_var(--rally-surface),0_0_0_4px_var(--rally-chip-on-border)]"
          />
          <Check
            aria-hidden
            strokeWidth={2.5}
            className="pointer-events-none absolute inset-0 m-auto hidden h-3.5 w-3.5 text-white peer-checked:block dark:text-paper"
          />
        </span>
        미지원 · 지원취소 포함
      </label>
      {/* 막힌 버튼은 툴팁이 안 뜨는 브라우저가 있어 감싼 span에 title */}
      <span className="ml-auto" title={canPrint ? undefined : '인쇄할 회사가 없어요'}>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!canPrint}
          className={`${BUTTON_PRIMARY} gap-1.5 disabled:cursor-not-allowed`}
        >
          <Printer className="h-4 w-4" aria-hidden />
          인쇄
        </button>
      </span>
    </div>
  );
}
