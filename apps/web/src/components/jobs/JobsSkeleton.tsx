import { Skeleton } from '../Skeleton';

// /jobs 로딩 (page Suspense fallback + loading.tsx 공용).
export function JobsSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">채용 리스트</h1>
        <Skeleton className="h-10 w-96 max-w-full" />
      </div>
      <Skeleton className="h-52" />
      <Skeleton className="h-64" />
    </>
  );
}
