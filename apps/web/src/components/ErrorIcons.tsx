// 오류 화면 아이콘 (docs/design/rally-error*.html) — 40px 선 아이콘, stroke 1.5, 색은 부르는 쪽(icon-faint).
// 404 = 나침반(길을 잃음), 오류 = 끊긴 맥박선 + 점선 원(연결이 끊김). 앱 전체 오류 화면도 같은 모양을 인라인으로 씀.

export function LostIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2l-1.6 4.2-4.2 1.6 1.6-4.2z" />
    </svg>
  );
}

export function DisconnectedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 12h3.5l1.8-3.5 2.4 7 1.8-3.5H20" />
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3.5" />
    </svg>
  );
}
