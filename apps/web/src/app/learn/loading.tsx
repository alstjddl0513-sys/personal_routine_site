import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink">
      <div className="mx-auto flex max-w-220 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">오늘의 학습</h1>
          <p className="text-[15px] text-ink-soft">답을 확인하고 이해완료 · 복습필요로 표시해요.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-14 rounded-[18px]" />
          <Skeleton className="h-9 w-20 rounded-[18px]" />
          <Skeleton className="h-9 w-24 rounded-[18px]" />
          <Skeleton className="h-9 w-16 rounded-[18px]" />
        </div>
        <Skeleton className="h-64 w-full max-w-200" />
      </div>
    </div>
  );
}
