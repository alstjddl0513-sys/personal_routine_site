import { DEFAULT_PREFERENCES, type Preferences } from '@repo/shared';
import {
  getMasterEnabled,
  isApplyingRemote as isMasterApplyingRemote,
  setMasterEnabledSilent,
} from './notif-master';
import {
  getEnabled as getMorningEnabled,
  isApplyingRemote as isMorningApplyingRemote,
  setEnabledSilent as setMorningEnabledSilent,
} from './morning-summary';
import {
  getEnabled as getRoutineEnabled,
  isApplyingRemote as isRoutineApplyingRemote,
  setEnabledSilent as setRoutineEnabledSilent,
} from './routine-reminder';
import {
  getEnabled as getDeadlineEnabled,
  isApplyingRemote as isDeadlineApplyingRemote,
  setEnabledSilent as setDeadlineEnabledSilent,
} from './deadline-notifier';
import {
  getEnabled as getWorkoutSkipEnabled,
  getSkipDays,
  isApplyingRemote as isWorkoutSkipApplyingRemote,
  setEnabledSilent as setWorkoutSkipEnabledSilent,
  setSkipDaysSilent,
} from './workout-skip';

// 5개 notif lib의 localStorage 값을 하나의 Preferences 객체로 조립.
// SyncClient가 서버로 upload할 때, 또는 debounce PATCH payload를 만들 때 사용.
export function readLocalPreferences(): Preferences {
  return {
    notif: {
      master: getMasterEnabled(),
      morningSummary: getMorningEnabled(),
      deadline: getDeadlineEnabled(),
      routineEvening: getRoutineEnabled(),
      workoutSkip: {
        enabled: getWorkoutSkipEnabled(),
        skipDays: getSkipDays(),
      },
    },
  };
}

// 서버에서 받아온 Preferences를 localStorage에 반영. silent setter 경유로
// UI 갱신은 하지만 sync client가 이 dispatch를 upload 트리거로 재해석하지 않음
// (각 lib의 applyingRemote 플래그로 가드).
//
// 서버 값에 필드가 부분적으로만 있으면 DEFAULT로 fallback.
export function applyRemotePreferences(remote: Preferences): void {
  const notif = remote?.notif ?? DEFAULT_PREFERENCES.notif;
  setMasterEnabledSilent(notif.master ?? DEFAULT_PREFERENCES.notif.master);
  setMorningEnabledSilent(
    notif.morningSummary ?? DEFAULT_PREFERENCES.notif.morningSummary,
  );
  setDeadlineEnabledSilent(
    notif.deadline ?? DEFAULT_PREFERENCES.notif.deadline,
  );
  setRoutineEnabledSilent(
    notif.routineEvening ?? DEFAULT_PREFERENCES.notif.routineEvening,
  );
  const ws = notif.workoutSkip ?? DEFAULT_PREFERENCES.notif.workoutSkip;
  setWorkoutSkipEnabledSilent(
    ws.enabled ?? DEFAULT_PREFERENCES.notif.workoutSkip.enabled,
  );
  setSkipDaysSilent(
    ws.skipDays ?? DEFAULT_PREFERENCES.notif.workoutSkip.skipDays,
  );
}

// 서버가 신규 계정 시드 상태(`{}`)를 반환했는지 판정. notif 노드가 없거나
// 빈 객체면 아직 마이그레이션 안 됨 → 클라의 localStorage 값을 1회 upload.
export function isDefaultServerPrefs(
  prefs: Preferences | Record<string, unknown> | null | undefined,
): boolean {
  if (!prefs || typeof prefs !== 'object') return true;
  const notif = (prefs as { notif?: unknown }).notif;
  if (!notif || typeof notif !== 'object') return true;
  return Object.keys(notif as Record<string, unknown>).length === 0;
}

// SyncClient가 이벤트를 받았을 때 upload를 스킵해야 하는지. 지금 리모트 반영
// 중인 lib이 하나라도 있으면 true.
export function isAnyApplyingRemote(): boolean {
  return (
    isMasterApplyingRemote() ||
    isMorningApplyingRemote() ||
    isDeadlineApplyingRemote() ||
    isRoutineApplyingRemote() ||
    isWorkoutSkipApplyingRemote()
  );
}
