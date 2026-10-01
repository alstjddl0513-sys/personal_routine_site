import { Skeleton } from '../../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">루틴 통계</h1>
      </header>
      <Skeleton className="h-16" />
      <Skeleton className="h-20" />
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </div>
  );
}
