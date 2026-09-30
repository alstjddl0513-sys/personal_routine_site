import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">기술 블로그</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            즐겨찾는 기술 블로그의 새 글을 모아봅니다.
          </p>
        </div>
        <Skeleton className="h-6 w-20" />
      </header>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
