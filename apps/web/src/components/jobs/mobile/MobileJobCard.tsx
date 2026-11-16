'use client';

import { useOptimistic, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_LABELS,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type Company,
  type CompanyEvent,
  type CompanyType,
  type CompanyType1,
  type Document,
  type Priority,
} from '@repo/shared';
import { BottomSheet } from '../../ui/BottomSheet';
import { FOCUS_RING } from '../../settings/lists/ListCard';
import { StatusDot, statusTextClass } from '../StatusDot';
import { useCompanyPatch } from '../useCompanyPatch';
import { FavoriteToggle } from '../cells/FavoriteToggle';
import { DeleteRowButton } from '../cells/DeleteRowButton';
import { CLOSED_STATUSES, DeadlineEditor, TableDeadline } from '../cells/DeadlinePopover';
import { EventsEditor, formatDateShort, TYPE_DOT, useCompanyEventActions } from '../cells/EventsPopover';
import { UrlEditor } from '../cells/UrlPopover';
import { NoteEditor } from '../cells/NotePopover';
import { SubmittedDocsEditor, useSubmittedDocs } from '../cells/SubmittedDocsPopover';

// 모바일 채용 카드(docs/design/rally-mobile-jobs*.html). 접힌 카드 두 줄 → 누르면 그 자리에서 10줄로 펼침
// (여러 장 동시에). 줄을 누르면 그 칸의 바텀시트 — 고르기는 누르면 바로 반영 · 닫힘, 입력은 표 팝오버와 같은 Editor.
// 값은 표 셀과 같은 방식으로 저장(patchCompany → router.refresh, 고르기는 useOptimistic으로 바로 보임).

const PRIORITY_TONE: Record<Priority, string> = {
  urgent: 'font-semibold text-alert',
  important: 'text-ink-soft',
  normal: 'text-ink-muted',
};

type SheetKey = 'type2' | 'type1' | 'priority' | 'hiring' | 'status' | 'deadline' | 'events' | 'url' | 'docs' | 'note';

export function MobileJobCard({
  company: c,
  companyTypes,
  events,
  documents,
  highlighted,
}: {
  company: Company;
  companyTypes: CompanyType[];
  events: CompanyEvent[];
  documents: Document[];
  highlighted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const { patch } = useCompanyPatch(c.id);

  // 고르기 · 토글은 시트를 닫자마자 카드에 보이게
  const [type2, setType2] = useOptimistic(c.type2);
  const [type1, setType1] = useOptimistic<CompanyType1>(c.type1);
  const [priority, setPriority] = useOptimistic<Priority>(c.priority);
  const [status, setStatus] = useOptimistic<ApplicationStatus>(c.applicationStatus);
  const [hiring, setHiring] = useOptimistic(c.isHiring);

  const docs = useSubmittedDocs(c.id, c.resumeDocumentId, c.portfolioDocumentId);
  const eventActions = useCompanyEventActions(c.id);

  const typeLabel = companyTypes.find((t) => t.key === type2)?.label ?? type2;
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const docTitle = (docId: string | null) => documents.find((d) => d.id === docId)?.title ?? null;
  const docsSummary =
    [docTitle(docs.linked.resumeDocumentId), docTitle(docs.linked.portfolioDocumentId)].filter(Boolean).join(' · ') ||
    null;
  const close = () => setSheet(null);

  return (
    <article
      data-cid={c.id}
      className={`rounded-lg border border-line bg-surface font-plex ${
        highlighted ? 'animate-[row-flash_1.5s_ease-out]' : ''
      }`}
    >
      {/* 머리: 본문 전체가 펼치기 버튼, ♡는 버튼 바깥(버튼 중첩 X) */}
      <div className="flex items-start">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-1 rounded-l-lg py-3 pr-1 pl-4 text-left ${FOCUS_RING}`}
        >
          <span className="flex w-full items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-base font-bold text-ink">{c.name}</span>
            <span className={`flex flex-none items-center gap-1.5 text-[13.5px] ${statusTextClass(status)}`}>
              <StatusDot status={status} />
              {APPLICATION_STATUS_LABELS[status]}
            </span>
            <ChevronDown
              className={`h-4 w-4 flex-none text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </span>
          <span className="flex w-full items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[13.5px] text-ink-muted">
              {typeLabel} · {COMPANY_TYPE_1_LABELS[type1]}
            </span>
            <span className="flex flex-none items-center gap-1.5 whitespace-nowrap">
              <TableDeadline
                iso={c.applicationDeadline}
                rolling={c.isRolling}
                closed={CLOSED_STATUSES.includes(status)}
                pastCompact
              />
            </span>
          </span>
        </button>
        <span className="flex-none pt-1.5 pr-1">
          <FavoriteToggle id={c.id} value={c.isFavorite} />
        </span>
      </div>

      {open ? (
        <div className="border-t border-divider px-4">
          <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-divider">
            <FieldRow label="유형" onOpen={() => setSheet('type2')}>
              {typeLabel}
            </FieldRow>
            <FieldRow label="규모" onOpen={() => setSheet('type1')}>
              {COMPANY_TYPE_1_LABELS[type1]}
            </FieldRow>
            <FieldRow label="우선순위" onOpen={() => setSheet('priority')}>
              <span className={PRIORITY_TONE[priority]}>{PRIORITY_LABELS[priority]}</span>
            </FieldRow>
            <FieldRow label="채용여부" onOpen={() => setSheet('hiring')}>
              {hiring ? (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span aria-hidden className="h-1.75 w-1.75 rounded-full bg-primary" />
                  채용중
                </span>
              ) : (
                <span className="text-icon-faint">—</span>
              )}
            </FieldRow>
            <FieldRow label="지원상태" onOpen={() => setSheet('status')}>
              <span className={`inline-flex items-center gap-1.5 ${statusTextClass(status)}`}>
                <StatusDot status={status} />
                {APPLICATION_STATUS_LABELS[status]}
              </span>
            </FieldRow>
            <FieldRow label="마감일" onOpen={() => setSheet('deadline')}>
              <span className="inline-flex items-center gap-1.5">
                <TableDeadline
                  iso={c.applicationDeadline}
                  rolling={c.isRolling}
                  closed={CLOSED_STATUSES.includes(status)}
                />
              </span>
            </FieldRow>
            <BlockRow label={sortedEvents.length ? `일정 ${sortedEvents.length}건` : '일정'} onOpen={() => setSheet('events')}>
              {sortedEvents.length ? (
                <ul className="flex flex-col gap-1">
                  {sortedEvents.map((e) => (
                    <li key={e.id} className="flex min-w-0 items-center gap-2 text-[13.5px]">
                      <span aria-hidden className={`h-1.75 w-1.75 flex-none rounded-full ${TYPE_DOT[e.type]}`} />
                      <span className="flex-none text-ink-muted tabular-nums">{formatDateShort(e.date)}</span>
                      <span className="min-w-0 truncate text-ink-soft">{e.note ?? ''}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </BlockRow>
            <FieldRow label="공고" onOpen={() => setSheet('url')}>
              {c.postingUrl ? (
                <span className="font-mono text-[12.5px] text-ink-soft">{c.postingUrl.replace(/^https?:\/\//, '')}</span>
              ) : (
                <span className="text-icon-faint">—</span>
              )}
            </FieldRow>
            <FieldRow label="제출본" onOpen={() => setSheet('docs')}>
              {docsSummary ?? <span className="text-icon-faint">—</span>}
            </FieldRow>
            <BlockRow label="메모" onOpen={() => setSheet('note')}>
              {c.note ? <p className="line-clamp-2 text-[13.5px] whitespace-pre-line text-ink-soft">{c.note}</p> : null}
            </BlockRow>
          </ul>
          <div className="-mx-4 flex justify-end border-t border-divider px-2 py-1">
            <DeleteRowButton id={c.id} name={c.name} eventCount={events.length} hasNote={!!c.note} />
          </div>
        </div>
      ) : null}

      {/* 칸 편집 시트 — 하나씩만 열림 */}
      <OptionSheet
        open={sheet === 'type2'}
        title="유형"
        onClose={close}
        value={type2}
        options={companyTypes.map((t) => ({ value: t.key, label: t.label }))}
        onPick={(v) => patch({ type2: v }, () => setType2(v))}
        footer={
          <Link
            href="/settings/company-types"
            className={`flex min-h-12 items-center justify-between rounded-md px-3 text-[15px] text-heading ${FOCUS_RING}`}
          >
            유형 관리
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <OptionSheet
        open={sheet === 'type1'}
        title="규모"
        onClose={close}
        value={type1}
        options={COMPANY_TYPE_1_VALUES.map((v) => ({ value: v, label: COMPANY_TYPE_1_LABELS[v] }))}
        onPick={(v) => patch({ type1: v as CompanyType1 }, () => setType1(v as CompanyType1))}
      />
      <OptionSheet
        open={sheet === 'priority'}
        title="우선순위"
        onClose={close}
        value={priority}
        options={PRIORITY_VALUES.map((v) => ({ value: v, label: PRIORITY_LABELS[v] }))}
        onPick={(v) => patch({ priority: v as Priority }, () => setPriority(v as Priority))}
      />
      <OptionSheet
        open={sheet === 'status'}
        title="지원상태"
        onClose={close}
        value={status}
        options={APPLICATION_STATUS_VALUES.map((v) => ({
          value: v,
          label: APPLICATION_STATUS_LABELS[v],
          icon: <StatusDot status={v} />,
          className: statusTextClass(v),
        }))}
        onPick={(v) => patch({ applicationStatus: v as ApplicationStatus }, () => setStatus(v as ApplicationStatus))}
      />
      <BottomSheet open={sheet === 'hiring'} onClose={close} title="채용여부">
        <label className="mx-5 my-2 flex min-h-13 cursor-pointer items-center justify-between gap-3">
          <span className="text-[15px]">채용중</span>
          <input
            type="checkbox"
            role="switch"
            checked={hiring}
            onChange={(e) => {
              const next = e.target.checked;
              patch({ isHiring: next }, () => setHiring(next));
            }}
            className={`relative h-7 w-12 flex-none cursor-pointer appearance-none rounded-full bg-check-off transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-6 before:w-6 before:rounded-full before:bg-surface before:shadow-sm before:transition-transform checked:bg-primary checked:before:translate-x-5 ${FOCUS_RING}`}
          />
        </label>
      </BottomSheet>
      <BottomSheet open={sheet === 'deadline'} onClose={close} title="마감일">
        <div className="px-5 py-2">
          <DeadlineEditor
            key={`${c.applicationDeadline}-${c.isRolling}`}
            initialIso={c.applicationDeadline}
            initialRolling={c.isRolling}
            hasCurrent={!!c.applicationDeadline || c.isRolling}
            large
            onCommit={(nextIso, nextRolling) => {
              close();
              const iso = nextRolling ? null : nextIso;
              if (iso === c.applicationDeadline && nextRolling === c.isRolling) return;
              patch({ applicationDeadline: iso, isRolling: nextRolling });
            }}
          />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'events'} onClose={close} title="일정">
        <div className="flex flex-col gap-3 px-5 py-2">
          <EventsEditor
            events={events}
            isPending={eventActions.isPending}
            onCreate={eventActions.onCreate}
            onDelete={eventActions.onDelete}
          />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'url'} onClose={close} title="공고">
        <div className="flex flex-col gap-3 px-5 py-2">
          <UrlEditor
            key={c.postingUrl ?? ''}
            current={c.postingUrl}
            isPending={false}
            revertable
            onCommit={(next) => {
              close();
              if (next !== c.postingUrl) patch({ postingUrl: next });
            }}
          />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'docs'} onClose={close} title="제출본">
        <div className="flex flex-col gap-3 px-5 py-2">
          <SubmittedDocsEditor linked={docs.linked} count={docs.count} documents={documents} onCommit={docs.commit} />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'note'} onClose={close} title="메모">
        <div className="flex flex-col gap-3 px-5 py-2">
          <NoteEditor
            key={c.note ?? ''}
            initialNote={c.note}
            revertable
            onCommit={(next) => {
              close();
              if (next !== c.note) patch({ note: next });
            }}
          />
        </div>
      </BottomSheet>
    </article>
  );
}

// 한 줄 = [라벨 66px] [값 오른쪽 · 넘치면 …] [›], 48px. 줄 아무 데나 누르면 그 칸의 시트.
function FieldRow({ label, onOpen, children }: { label: string; onOpen: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-md text-left ${FOCUS_RING}`}
      >
        <span className="w-16.5 flex-none text-[13.5px] text-ink-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-ink">{children}</span>
        <ChevronRight className="h-4 w-4 flex-none text-ink-faint" aria-hidden />
      </button>
    </li>
  );
}

// 일정 · 메모 — 윗줄 라벨 + ›, 아래에 내용 미리보기
function BlockRow({ label, onOpen, children }: { label: string; onOpen: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-md py-3 text-left ${FOCUS_RING}`}
      >
        <span className="flex w-full items-center justify-between">
          <span className="text-[13.5px] text-ink-muted">{label}</span>
          <ChevronRight className="h-4 w-4 flex-none text-ink-faint" aria-hidden />
        </span>
        {children ?? <span className="text-sm text-icon-faint">—</span>}
      </button>
    </li>
  );
}

// 고르기 시트 — 누르면 바로 반영하고 닫힘([저장] 없음). 고른 것 = chip-on 배경 + 700 + ✓, 줄 52px
function OptionSheet({
  open,
  title,
  onClose,
  value,
  options,
  onPick,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  value: string;
  options: { value: string; label: string; icon?: ReactNode; className?: string }[];
  onPick: (value: string) => void;
  footer?: ReactNode;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ul className="flex flex-col gap-0.5 px-3 pt-1 pb-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <li key={o.value}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onClose();
                  if (!selected) onPick(o.value);
                }}
                className={`flex min-h-13 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-left text-[15px] ${FOCUS_RING} ${
                  selected ? 'bg-chip-on-bg font-bold text-chip-on-fg' : `hover:bg-row-hover ${o.className ?? 'text-ink'}`
                }`}
              >
                {o.icon}
                <span className="flex-1">{o.label}</span>
                {selected ? <Check className="h-4.5 w-4.5 flex-none" strokeWidth={2.2} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {footer ? <div className="border-t border-divider px-3 py-1">{footer}</div> : null}
    </BottomSheet>
  );
}
