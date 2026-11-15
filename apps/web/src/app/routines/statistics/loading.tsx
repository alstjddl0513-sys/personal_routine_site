import { Skeleton } from '../../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-7 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">루틴 통계</h1>
        <Skeleton className="-mt-5 h-6 w-56" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
