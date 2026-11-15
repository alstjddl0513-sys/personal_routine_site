import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-7 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">루틴 트래커</h1>
          <Skeleton className="h-10 w-80" />
        </header>
        <Skeleton className="h-52" />
        <Skeleton className="h-96" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
