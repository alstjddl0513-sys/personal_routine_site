import { Skeleton } from '../Skeleton';

// 각 카드의 실제 높이·배치를 맞춘 Suspense fallback (CLS 방지).

const CARD = 'flex min-w-0 flex-col gap-4 rounded-[22px] border border-line bg-surface p-5 md:p-6.5';

export function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function LearnSkeleton() {
  return (
    <div className="flex min-h-70 min-w-0 flex-[3_1_560px] flex-col gap-4 rounded-[22px] bg-court p-6 md:p-7.5">
      <div className="h-4 w-24 animate-pulse rounded bg-court-soft" />
      <div className="h-8 w-3/4 animate-pulse rounded bg-court-soft" />
      <div className="mt-auto h-12 w-36 animate-pulse rounded-full bg-court-soft" />
    </div>
  );
}

export function ListCardSkeleton({ className = '', rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={`${CARD} ${className}`}>
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function BlogSkeleton() {
  return (
    <div className={CARD}>
      <Skeleton className="h-5 w-44" />
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-18 min-w-0 flex-[1_1_260px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
