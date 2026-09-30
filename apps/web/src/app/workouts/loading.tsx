import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 pb-40 md:pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">운동 기록</h1>
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-8 w-48" />
      </header>
      <Skeleton className="h-10" />
      <Skeleton className="h-64" />
    </div>
  );
}
