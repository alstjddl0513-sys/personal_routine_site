// Suspense fallback용 grey box primitive. 크기/모양은 tailwind class로.
// 페이지별 skeleton 조합은 각 page.tsx 안에 인라인 함수로 두어 CLS를 잡기
// 쉽게 실제 컨텐트 크기와 나란히 관리.

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}
