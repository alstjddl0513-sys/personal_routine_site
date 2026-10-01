import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-xl font-semibold">루틴 트래커</h1>
        <Skeleton className="h-8 w-48" />
      </header>
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </div>
  );
}
