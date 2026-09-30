import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">오늘의 학습</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            답을 확인한 뒤 &lsquo;이해완료&rsquo; 또는 &lsquo;복습필요&rsquo;로 표시해두세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-7 w-12 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
      </header>
      <Skeleton className="h-96" />
    </div>
  );
}
