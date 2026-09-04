'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  type Company,
  type CompanyType,
} from '@repo/shared';
import { DeadlinePopover } from './cells/DeadlinePopover';
import { DeleteRowButton } from './cells/DeleteRowButton';
import { FavoriteToggle } from './cells/FavoriteToggle';
import { HiringToggle } from './cells/HiringToggle';
import { NotePopover } from './cells/NotePopover';
import { PrioritySelect } from './cells/PrioritySelect';
import { SizeSelect } from './cells/SizeSelect';
import { StatusSelect, STATUS_STYLE } from './cells/StatusSelect';
import { TypeSelect } from './cells/TypeSelect';
import { UrlPopover } from './cells/UrlPopover';

export function JobCard({
  company: c,
  companyTypes,
}: {
  company: Company;
  companyTypes: CompanyType[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-3 py-2">
        <FavoriteToggle id={c.id} value={c.isFavorite} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 py-1 text-left"
        >
          <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
          <span
            className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${STATUS_STYLE[c.applicationStatus]}`}
          >
            {APPLICATION_STATUS_LABELS[c.applicationStatus]}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className="border-t border-zinc-100 px-3 dark:border-zinc-800">
          <dl className="flex flex-col divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
            <Row label="유형">
              <TypeSelect id={c.id} value={c.type2} types={companyTypes} />
            </Row>
            <Row label="규모">
              <SizeSelect id={c.id} value={c.type1} />
            </Row>
            <Row label="우선순위">
              <PrioritySelect id={c.id} value={c.priority} />
            </Row>
            <Row label="채용중">
              <HiringToggle id={c.id} value={c.isHiring} />
            </Row>
            <Row label="지원상태">
              <StatusSelect id={c.id} value={c.applicationStatus} />
            </Row>
            <Row label="마감일">
              <DeadlinePopover id={c.id} value={c.applicationDeadline} />
            </Row>
            <Row label="공고링크">
              <UrlPopover id={c.id} value={c.postingUrl} />
            </Row>
            <Row label="메모">
              <NotePopover id={c.id} value={c.note} />
            </Row>
          </dl>
          <div className="flex justify-end border-t border-zinc-100 py-2 dark:border-zinc-800">
            <DeleteRowButton id={c.id} name={c.name} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="flex items-center">{children}</dd>
    </div>
  );
}
