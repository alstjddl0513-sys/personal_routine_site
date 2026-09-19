import { type Company, type CompanyType } from '@repo/shared';
import { JobCard } from './JobCard';

export function JobsCards({
  rows,
  companyTypes,
  highlightId,
}: {
  rows: Company[];
  companyTypes: CompanyType[];
  highlightId?: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {rows.map((c) => (
        <JobCard
          key={c.id}
          company={c}
          companyTypes={companyTypes}
          highlighted={c.id === highlightId}
        />
      ))}
    </div>
  );
}
