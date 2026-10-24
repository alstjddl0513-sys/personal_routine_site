// 라임 원 안의 코트 그린 삼각 깃발 (docs/design/rally-dashboard-design.html).
// 색은 브랜드 고정값이라 다크에서도 그대로 — 토큰 대신 court/lime 직접 사용.
export function RallyLogo({ size = 28 }: { size?: number }) {
  const icon = Math.round(size * 0.6);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-lime"
      style={{ width: size, height: size }}
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#17382B"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 21V3.5" />
        <path d="M6 3.5L19 8.25L6 13Z" fill="#17382B" />
      </svg>
    </span>
  );
}
