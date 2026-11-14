// 깃대 + 메리골드 삼각 깃발 (docs/design/rally-dashboard.html). 숲색 사이드바
// 위에 놓이는 전제라 기본 깃대 색은 side-strong — 라이트·다크 공통.
// 밝은 바탕(로그인 화면 등)에선 stemClassName으로 깃대 색만 바꿈(stroke-ink-strong).
export function RallyLogo({
  size = 22,
  stemClassName = 'stroke-side-strong',
}: {
  size?: number;
  stemClassName?: string;
}) {
  return (
    <svg
      width={Math.round((size * 20) / 22)}
      height={size}
      viewBox="0 0 20 22"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M3.5 21V1.8"
        className={stemClassName}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d="M4.5 2.2L18 7.4L4.5 12.4Z" className="fill-marigold" />
    </svg>
  );
}
