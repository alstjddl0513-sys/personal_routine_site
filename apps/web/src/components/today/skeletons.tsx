import { Skeleton } from '../Skeleton';

// 각 섹션의 실제 높이·배치를 맞춘 Suspense fallback (CLS 방지).

export function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 border-b border-rule pb-6">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
  );
}

export function ListCardSkeleton({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-6 md:px-7 ${className}`}
    >
      <Skeleton className="h-6 w-28" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function PanelSkeleton({ rows = 3, last }: { rows?: number; last?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 py-7 first:pt-1 ${last ? '' : 'border-b border-rule'}`}
    >
      <Skeleton className="h-6 w-28" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

export function BlogSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-6">
      <Skeleton className="h-6 w-44" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
