import { Skeleton } from '../../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">학습 통계</h1>
        <Skeleton className="h-36" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 md:w-90" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
