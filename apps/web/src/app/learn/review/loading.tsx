import { Skeleton } from '../../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink">
      <div className="mx-auto flex max-w-220 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">복습</h1>
          <p className="text-[15px] text-ink-soft">다시 읽고 이해했으면 이해완료로 바꿔요.</p>
        </header>
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-9 w-56 rounded-[18px]" />
        </div>
        <Skeleton className="h-64 w-full max-w-200" />
      </div>
    </div>
  );
}
