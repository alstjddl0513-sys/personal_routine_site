import type { CompanyEventType } from '@repo/shared';

// 일정 유형 점 + 글자색 ('오늘' 다가오는 일정과 같은 색). [글자, 점]
export const EVENT_TONE: Record<CompanyEventType, [string, string]> = {
  deadline: ['text-alert', 'bg-alert'],
  test: ['text-ev-test', 'bg-ev-test'],
  interview: ['text-ev-interview', 'bg-ev-interview'],
  announcement: ['text-ev-announce', 'bg-ev-announce'],
  other: ['text-ev-other', 'bg-ev-other'],
};

// 범례 순서.
export const EVENT_TYPES: CompanyEventType[] = [
  'deadline',
  'test',
  'interview',
  'announcement',
  'other',
];
