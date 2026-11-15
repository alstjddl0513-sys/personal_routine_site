import { Info } from 'lucide-react';

// ⓘ 말풍선 — 기본 title 툴팁은 늦게 뜨고 클릭·포커스로는 안 떠서, hover·포커스에 바로 뜨는 말풍선.
// 루틴 통계 스트릭 말풍선과 같은 모양(bg-ink · text-paper → 라이트 진한 바탕/흰 글자, 다크는 반대).
export function InfoTip({
  id,
  label,
  lines,
  align = 'center',
}: {
  id: string;
  /** 버튼 이름(스크린리더) — 예: "스트릭 세는 기준" */
  label: string;
  lines: string[];
  /** 칸 오른쪽 끝에 있으면 'end'로 — 화면 밖으로 안 나가게 */
  align?: 'center' | 'start' | 'end';
}) {
  const pos =
    align === 'start'
      ? 'left-0'
      : align === 'end'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:text-ink"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-20 mt-1.5 flex w-max max-w-80 flex-col rounded-md bg-ink px-3 py-2 text-[13px] leading-normal font-normal break-keep text-paper opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${pos}`}
      >
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
    </span>
  );
}
