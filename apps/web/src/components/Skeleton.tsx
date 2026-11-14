// Suspense fallback용 회색 상자(--rally-divider — 카드 안 구분선과 같은 색이라 바탕 · 카드 위 둘 다 은은함). 크기/모양은 tailwind class로.
// 페이지별 skeleton 조합은 각 page.tsx 안에 인라인 함수로 두어 CLS를 잡기
// 쉽게 실제 컨텐트 크기와 나란히 관리.

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-divider ${className}`}
    />
  );
}
