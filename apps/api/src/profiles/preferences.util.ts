// preferences JSONB의 partial patch를 서버 저장 시 병합하는 유틸.
// Postgres `||`는 shallow라 nested `{ notif: { workoutSkip: { skipDays } } }`
// 하나만 오면 notif 전체를 덮어써버림. 애플리케이션 레이어에서 재귀 병합
// 후 통째로 UPDATE 하는 게 안전 (트랜잭션 + row lock으로 lost-update 방지).

// plain object 판정. 배열/null/Date는 replace 대상.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// target에 patch를 재귀 병합. 양쪽 모두 plain object인 필드만 재귀 진입.
// 그 외(primitive, array, null, undefined)는 patch 값으로 replace.
// unknown 키 방어는 DTO(whitelist)에서 이미 처리되므로 여기선 자유롭게 병합.
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  patch: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...target };
  for (const [key, patchVal] of Object.entries(patch)) {
    if (patchVal === undefined) continue;
    const targetVal = result[key];
    if (isPlainObject(patchVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, patchVal);
    } else {
      result[key] = patchVal;
    }
  }
  return result as T;
}
