import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex w-full max-w-310 flex-1 flex-col gap-5 px-4 pt-6 pb-40 md:px-10 md:pt-9 md:pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">운동 기록</h1>
          <Skeleton className="h-10 w-56" />
        </header>
        <Skeleton className="h-10 w-120 max-w-full" />
        <Skeleton className="h-11" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}
