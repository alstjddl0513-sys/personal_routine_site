'use client';

import {
  type Company,
  type CompanyEvent,
  type CompanyType,
  type Document,
} from '@repo/shared';
import { JobCard } from './JobCard';

export function JobsCards({
  rows,
  companyTypes,
  eventsByCompany,
  documents,
  highlightId,
}: {
  rows: Company[];
  companyTypes: CompanyType[];
  eventsByCompany: Map<string, CompanyEvent[]>;
  documents: Document[];
  highlightId?: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {rows.map((c) => (
        <JobCard
          key={c.id}
          company={c}
          companyTypes={companyTypes}
          events={eventsByCompany.get(c.id) ?? []}
          documents={documents}
          highlighted={c.id === highlightId}
        />
      ))}
    </div>
  );
}
