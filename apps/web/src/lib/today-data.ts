import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import {
  getCompanies,
  getCompanyEvents,
  getMyProfile,
  getRoutineChecks,
  getTimeBlocks,
} from './api';
import { addDays, todayInSeoul, toISODate } from './routines-week';

// /today 대시보드 공용 로더. 섹션마다 Suspense라 같은 데이터(companies:
// 헤더+채용, blocks/checks: 헤더+루틴)를 여러 섹션이 각자 부름 → React
// cache로 요청 단위 dedupe. cache는 요청 스코프라 유저 간 공유 없음
// (unstable_cache처럼 URL 기반 공유 캐시가 아님).

// 스트릭 계산 lookback. /routines/statistics와 같은 폭.
const STREAK_LOOKBACK_DAYS = 180;

// 서버(Vercel UTC)에서도 한국 날짜 기준. 날짜 비교 헬퍼에 `now`로 넘김.
export const getToday = cache(() => {
  const today = todayInSeoul();
  return { today, todayIso: toISODate(today) };
});

export const loadCompanies = cache(() => getCompanies());

export const loadTimeBlocks = cache(() => getTimeBlocks());

// 오늘 체크 + 스트릭을 한 번에 — 오늘 체크는 여기서 date 필터.
export const loadRecentChecks = cache(() => {
  const { today, todayIso } = getToday();
  return getRoutineChecks({
    from: toISODate(addDays(today, -STREAK_LOOKBACK_DAYS)),
    to: todayIso,
  });
});

export const loadTodayCompanyEvents = cache(() => {
  const { todayIso } = getToday();
  return getCompanyEvents({ from: todayIso, to: todayIso });
});

export const loadProfile = cache(() => settle(getMyProfile()));

// 섹션별 fetch 실패를 카드 안에 가둠 — 한 API가 죽어도 페이지 전체는 유지.
// 단 Next 내부 신호(동적 렌더 전환·redirect 등)는 삼키면 안 돼서 rethrow.
// 안 그러면 빌드 때 에러 상태가 정적 HTML로 굳을 수 있음.
export async function settle<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    unstable_rethrow(e);
    console.error('[today]', e);
    return null;
  }
}
