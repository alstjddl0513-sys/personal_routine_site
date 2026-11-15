import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink">
      <div className="mx-auto flex max-w-310 flex-col gap-4 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">기술 블로그</h1>
          <p className="text-[15px] text-ink-soft">
            구독한 블로그의 새 글이에요. 매일 오전 8시·오후 8시에 자동으로 가져와요.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-14 rounded-[18px]" />
          <Skeleton className="h-9 w-20 rounded-[18px]" />
          <Skeleton className="h-9 w-16 rounded-[18px]" />
          <Skeleton className="h-9 w-20 rounded-[18px]" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
