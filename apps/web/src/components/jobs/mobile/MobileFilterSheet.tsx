'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type Company,
  type CompanyType,
  type CompanyType1,
  type Priority,
} from '@repo/shared';
import { BottomSheet } from '../../ui/BottomSheet';
import { BUTTON_PRIMARY, BUTTON_TEXT } from '../cells/popover-style';
import { FOCUS_RING } from '../../settings/lists/ListCard';
import { StatusDot } from '../StatusDot';
import type { JobsClientFilters } from '../JobsFilters';

export interface MobileFilterDraft extends JobsClientFilters {
  hiring: boolean;
}

// 모바일 필터 시트(docs/design/rally-mobile-jobs*.html) — 위 64px 남기고 올라오는 큰 시트.
// 시트 안에서 고른 칩은 초안이라 목록이 안 움직이고, [n개 보기]를 눌러야 적용. n = 지금 받은 목록에
// 초안 조건을 건 수. 채용여부만 서버가 거르는 조건이라, 이미 켜 둔 걸 끄면 전체 수를 몰라 "결과 보기".
export function MobileFilterSheet({
  open,
  onClose,
  companyTypes,
  applied,
  rows,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  companyTypes: CompanyType[];
  applied: MobileFilterDraft;
  /** 지금 화면에 받은 회사(검색 · 즐겨찾기 · 채용여부는 서버가 이미 거름) */
  rows: Company[];
  onApply: (draft: MobileFilterDraft) => void;
}) {
  const [draft, setDraft] = useState<MobileFilterDraft>(applied);
  // 열 때마다 지금 적용된 조건에서 시작
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(applied);
  }

  function toggle<K extends keyof JobsClientFilters>(key: K, v: string) {
    setDraft((d) => {
      const next = new Set(d[key] as ReadonlySet<string>);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return { ...d, [key]: next };
    });
  }

  const count = countFor(rows, draft, applied.hiring);
  const empty: MobileFilterDraft = {
    type1: new Set(),
    type2: new Set(),
    priority: new Set(),
    status: new Set(),
    hiring: false,
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="필터"
      tall
      className="md:hidden"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setDraft(empty)} className={BUTTON_TEXT}>
            초기화
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className={`${BUTTON_PRIMARY} min-h-11 px-5`}
          >
            {count === null ? '결과 보기' : `${count}개 보기`}
          </button>
        </div>
      }
    >
      <div className="flex flex-col px-5 pb-3 [&>section+section]:border-t [&>section+section]:border-divider">
        <Group
          title="유형"
          trailing={
            <Link
              href="/settings/company-types"
              className={`inline-flex min-h-10 items-center gap-0.5 rounded-md text-sm text-heading ${FOCUS_RING}`}
            >
              유형 관리
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        >
          {companyTypes.map((t) => (
            <Chip key={t.key} active={draft.type2.has(t.key)} onClick={() => toggle('type2', t.key)}>
              {t.label}
            </Chip>
          ))}
        </Group>
        <Group title="규모">
          {COMPANY_TYPE_1_VALUES.map((v) => (
            <Chip key={v} active={draft.type1.has(v)} onClick={() => toggle('type1', v)}>
              {COMPANY_TYPE_1_LABELS[v]}
            </Chip>
          ))}
        </Group>
        <Group title="우선순위">
          {PRIORITY_VALUES.map((v) => (
            <Chip key={v} active={draft.priority.has(v)} onClick={() => toggle('priority', v)}>
              {PRIORITY_LABELS[v]}
            </Chip>
          ))}
        </Group>
        <Group title="채용여부">
          <Chip active={draft.hiring} onClick={() => setDraft((d) => ({ ...d, hiring: !d.hiring }))}>
            채용중
          </Chip>
        </Group>
        <Group title="지원상태">
          {APPLICATION_STATUS_VALUES.map((v) => (
            <Chip key={v} active={draft.status.has(v)} onClick={() => toggle('status', v)}>
              <StatusDot status={v} />
              {APPLICATION_STATUS_LABELS[v]}
            </Chip>
          ))}
        </Group>
      </div>
    </BottomSheet>
  );
}

function countFor(rows: Company[], d: MobileFilterDraft, appliedHiring: boolean): number | null {
  // 채용여부를 이미 켜 둔 채 받은 목록이면 꺼졌을 때의 수는 서버에 물어봐야 알 수 있음
  if (appliedHiring && !d.hiring) return null;
  return rows.filter((c) => {
    if (d.hiring && !c.isHiring) return false;
    if (d.type1.size && !d.type1.has(c.type1 as CompanyType1)) return false;
    if (d.type2.size && !d.type2.has(c.type2)) return false;
    if (d.priority.size && !d.priority.has(c.priority as Priority)) return false;
    if (d.status.size && !d.status.has(c.applicationStatus as ApplicationStatus)) return false;
    return true;
  }).length;
}

function Group({ title, trailing, children }: { title: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <section role="group" aria-label={title} className="flex flex-col gap-2.5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-heading">{title}</h3>
        {trailing}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1.75 rounded-full border px-3.5 text-sm ${FOCUS_RING} ${
        active
          ? 'border-chip-on-border bg-chip-on-bg font-bold text-chip-on-fg shadow-[inset_0_0_0_1px_var(--rally-chip-on-border)]'
          : 'border-btn-border bg-btn-bg text-ink-soft'
      }`}
    >
      {children}
    </button>
  );
}
