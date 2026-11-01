'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { Company, CompanyEvent, Document } from '@repo/shared';
import { patchCompany } from '../../lib/api';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { EventsEditor, useCompanyEventActions } from './cells/EventsPopover';
import { NoteEditor } from './cells/NotePopover';
import { POPOVER_CLOSE } from './cells/popover-style';
import { SubmittedDocsEditor, useSubmittedDocs } from './cells/SubmittedDocsPopover';
import { UrlEditor } from './cells/UrlPopover';

// '간단히' 보기에서 합친 열을 누르면 열리는 오른쪽 패널. 그 회사의 공고·일정·
// 제출본·메모를 한 번에 — 편집 내용은 표 팝오버와 같은 Editor를 위치 없이 씀.
// 닫기: ✕ · ESC · 패널 바깥 클릭(다른 회사의 합친 열을 누르면 그 회사로 바뀜).
export function CompanyDetailPanel({
  company,
  events,
  documents,
  onClose,
}: {
  company: Company;
  events: CompanyEvent[];
  documents: Document[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useOutsideClick(panelRef, (e) => {
    const target = e.target as Element;
    // Select 목록(Portal)·다른 회사 열기 버튼은 바깥 클릭으로 치지 않음.
    if (target.closest?.('[role="listbox"], [data-detail-trigger]')) return;
    onClose();
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 열릴 때 포커스를 패널로 (키보드로 바로 이어서 편집).
  useEffect(() => {
    closeRef.current?.focus();
  }, [company.id]);

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-labelledby="company-detail-title"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-110 flex-col border-l border-line bg-surface font-plex text-ink shadow-[-12px_0_28px_rgba(28,31,29,0.10)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-divider px-6 py-4">
        <h2 id="company-detail-title" className="truncate text-lg font-bold">
          {company.name}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className={POPOVER_CLOSE}
        >
          <X className="h-4.5 w-4.5" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Section>
          <UrlSection company={company} />
        </Section>
        <Section>
          <EventsSection company={company} events={events} />
        </Section>
        <Section>
          <DocsSection company={company} documents={documents} />
        </Section>
        <Section>
          <NoteSection company={company} />
        </Section>
      </div>
    </aside>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-divider px-6 py-5 last:border-b-0">
      {children}
    </section>
  );
}

// 저장 후 서버 값으로 다시 그려지면(key 변경) 입력칸도 새 값으로 초기화.
function useCompanyPatch(id: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function patch(input: Parameters<typeof patchCompany>[1]) {
    startTransition(async () => {
      try {
        await patchCompany(id, input);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }
  return { isPending, patch };
}

function UrlSection({ company }: { company: Company }) {
  const { isPending, patch } = useCompanyPatch(company.id);
  return (
    <UrlEditor
      key={company.postingUrl ?? ''}
      current={company.postingUrl}
      isPending={isPending}
      onCommit={(next) => {
        if (next !== company.postingUrl) patch({ postingUrl: next });
      }}
      revertable
    />
  );
}

function EventsSection({ company, events }: { company: Company; events: CompanyEvent[] }) {
  const { isPending, onCreate, onDelete } = useCompanyEventActions(company.id);
  return (
    <EventsEditor events={events} isPending={isPending} onCreate={onCreate} onDelete={onDelete} />
  );
}

function DocsSection({ company, documents }: { company: Company; documents: Document[] }) {
  const { linked, count, commit } = useSubmittedDocs(
    company.id,
    company.resumeDocumentId,
    company.portfolioDocumentId,
  );
  return (
    <SubmittedDocsEditor linked={linked} count={count} documents={documents} onCommit={commit} />
  );
}

function NoteSection({ company }: { company: Company }) {
  const { patch } = useCompanyPatch(company.id);
  return (
    <NoteEditor
      key={company.note ?? ''}
      initialNote={company.note}
      onCommit={(next) => {
        if (next !== company.note) patch({ note: next });
      }}
      revertable
    />
  );
}
