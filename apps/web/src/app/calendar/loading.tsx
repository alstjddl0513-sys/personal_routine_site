import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-72" />
        </header>
        <Skeleton className="h-170" />
      </div>
    </div>
  );
}
