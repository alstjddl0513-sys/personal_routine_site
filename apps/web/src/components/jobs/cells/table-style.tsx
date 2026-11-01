import { ChevronDown } from 'lucide-react';

// 채용 표(데스크톱) 셀 공용 스타일 (docs/design/rally-jobs.html). 평소엔 글자처럼
// 보이고 행 hover 때만 ▾. 셀 컴포넌트의 variant="table"에서만 씀 — 모바일 카드는
// 기존 스타일 그대로.

// 글자형 트리거. 행(<tr>)에 `group` 클래스가 있어야 hover ▾가 동작.
export const TABLE_TRIGGER =
  'inline-flex min-h-10 cursor-pointer items-center gap-1 rounded px-1.5 font-plex focus-visible:outline-2 focus-visible:outline-heading disabled:opacity-50';

// 회사명 아래 "유형 · 규모" 작은 글자 버튼.
export const TABLE_SMALL_TRIGGER =
  'cursor-pointer rounded px-0.5 py-0.5 font-plex text-[13px] text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-heading disabled:opacity-50';

// 아이콘 버튼 (일정·공고·제출본·메모·즐겨찾기·삭제).
export const TABLE_ICON_BUTTON =
  'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-0.75 rounded text-[13px] font-plex focus-visible:outline-2 focus-visible:outline-heading disabled:opacity-50';

export function HoverChevron() {
  return (
    <ChevronDown
      className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      strokeWidth={2}
      aria-hidden
    />
  );
}
