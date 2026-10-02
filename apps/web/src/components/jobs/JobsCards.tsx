'use client';

import {
  type Company,
  type CompanyEvent,
  type CompanyType,
} from '@repo/shared';
import { JobCard } from './JobCard';

export function JobsCards({
  rows,
  companyTypes,
  eventsByCompany,
  highlightId,
}: {
  rows: Company[];
  companyTypes: CompanyType[];
  eventsByCompany: Map<string, CompanyEvent[]>;
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
          highlighted={c.id === highlightId}
        />
      ))}
    </div>
  );
}
