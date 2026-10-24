import type { cookies } from 'next/headers';

// Mirror cookie는 CategoryFilterChips가 chip 변경 시 즉시 write. 존재 자체가
// "유저가 이 mode에 대한 선호를 남긴 적 있음" 신호 — 값이 빈 문자열이면
// '명시적 전체(=[])'. cookie 자체가 없으면 null 반환 → profile fallback.
// /learn과 /today(오늘의 학습)가 같은 5문제를 보도록 공용.
export function readCookieCategories(
  store: Awaited<ReturnType<typeof cookies>>,
  mode: 'daily' | 'review' | 'favorites',
): string[] | null {
  const c = store.get(`rally.learn.${mode}`);
  if (!c) return null;
  const raw = decodeURIComponent(c.value);
  if (raw.length === 0) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
