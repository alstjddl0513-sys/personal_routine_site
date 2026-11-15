// 채용 셀 팝오버 공용 스타일 (docs/design/rally-jobs-parts.html). 표·모바일 카드가
// 같은 팝오버를 쓰므로 둘 다 이 톤. 트리거 모양만 variant로 갈림.

export const POPOVER_CARD =
  'flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-left font-plex text-ink shadow-[0_12px_28px_rgba(28,31,29,0.12)]';

// 팝오버 제목 줄 ✕ 닫기.
export const POPOVER_CLOSE =
  '-mr-2 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover hover:text-ink';

// 화면 좌우 끝과의 간격 — 오른쪽 열 팝오버가 끝에 붙어 보이지 않게.
export const POPOVER_EDGE_MARGIN = 24;

export const POPOVER_TITLE = 'text-[13px] font-semibold text-ink-muted';

// 폭 없는 입력 — 한 줄에 여러 칸을 나눌 때 칸마다 폭(flex-1, w-36 등)을 직접 줌.
// w-full과 같이 쓰면 CSS 순서상 w-full이 이겨 폭 지정이 무시됨.
export const POPOVER_INPUT_BASE =
  'min-h-10 min-w-0 rounded-md border border-btn-border bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-heading disabled:opacity-50';

export const POPOVER_INPUT = `${POPOVER_INPUT_BASE} w-full`;

// 채운 숲색 — 저장·추가 같은 기본 동작.
export const BUTTON_PRIMARY =
  'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-button bg-button px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';

// 테두리 — 보조 동작(주소 복사 등).
export const BUTTON_SECONDARY =
  'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg px-3 text-sm text-ink hover:border-heading disabled:opacity-50';

// 글자 — 지우기·비우기 같은 가벼운 동작.
export const BUTTON_TEXT =
  'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md px-3 text-sm text-ink-muted hover:text-ink disabled:opacity-40';

export const POPOVER_CHECKBOX_LABEL =
  'flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-soft';
