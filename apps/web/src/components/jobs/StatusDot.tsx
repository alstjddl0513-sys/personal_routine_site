import type { ApplicationStatus } from '@repo/shared';

// 지원상태 8px 점 + 글자 톤 (docs/design/rally-jobs.html). '오늘' 일정 유형
// 점과 같은 스타일. 표·필터 칩·선택 옵션이 같이 씀. 마감색(alert)은 '급함'과
// 섞이지 않게 안 씀.

// [점, 글자]
const TONE: Record<ApplicationStatus, [string, string]> = {
  not_applied: ['shadow-[inset_0_0_0_1.5px_var(--rally-st-not-applied)]', 'text-ink-muted'],
  applied: ['bg-st-applied', 'font-medium text-ink'],
  document_passed: ['bg-st-doc-passed', 'font-medium text-ink'],
  document_failed: ['bg-st-failed', 'text-ink-muted'],
  interview_1_passed: ['bg-st-int1-passed', 'font-medium text-ink'],
  interview_1_failed: ['bg-st-failed', 'text-ink-muted'],
  interview_2_passed: ['bg-st-int2-passed', 'font-semibold text-ink'],
  interview_2_failed: ['bg-st-failed', 'text-ink-muted'],
  final_passed: [
    'bg-st-final-passed shadow-[0_0_0_2px_var(--rally-surface),0_0_0_3.5px_var(--rally-st-final-passed)]',
    'font-bold text-heading',
  ],
  final_failed: ['bg-st-failed', 'text-ink-muted'],
  withdrawn: ['shadow-[inset_0_0_0_1.5px_var(--rally-st-withdrawn)]', 'text-ink-faint'],
};

export function StatusDot({ status }: { status: ApplicationStatus }) {
  return (
    <span aria-hidden className={`h-2 w-2 flex-none rounded-full ${TONE[status][0]}`} />
  );
}

// 상태 글자 색·굵기.
export function statusTextClass(status: ApplicationStatus): string {
  return TONE[status][1];
}
