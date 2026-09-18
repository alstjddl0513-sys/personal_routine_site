'use client';

import { useEffect } from 'react';
import { getMyProfile, patchMyPreferences, type PreferencesPatch } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  applyRemotePreferences,
  isAnyApplyingRemote,
  isDefaultServerPrefs,
  readLocalPreferences,
} from '@/lib/preferences';
import { CHANGE_EVENT_NAME as MASTER_EVENT } from '@/lib/notif-master';
import { CHANGE_EVENT_NAME as MORNING_EVENT } from '@/lib/morning-summary';
import { CHANGE_EVENT_NAME as ROUTINE_EVENT } from '@/lib/routine-reminder';
import { CHANGE_EVENT_NAME as DEADLINE_EVENT } from '@/lib/deadline-notifier';
import {
  ENABLED_CHANGE_EVENT_NAME as WORKOUT_SKIP_ENABLED_EVENT,
  SKIP_DAYS_CHANGE_EVENT_NAME as WORKOUT_SKIP_DAYS_EVENT,
} from '@/lib/workout-skip';

const CHANGE_EVENTS = [
  MASTER_EVENT,
  MORNING_EVENT,
  ROUTINE_EVENT,
  DEADLINE_EVENT,
  WORKOUT_SKIP_ENABLED_EVENT,
  WORKOUT_SKIP_DAYS_EVENT,
];

const DEBOUNCE_MS = 800;

// 로그인 사용자의 알림 설정을 서버 profiles.preferences와 sync.
//
// 흐름:
// 1) mount: auth 확인 → GET /profiles/me → 서버 값 vs 로컬 값 비교
//    - 서버가 신규 계정 상태(notif 없음)면 → 로컬 값을 PATCH로 1회 upload (마이그레이션)
//    - 아니면 → 서버 값을 로컬에 silent 반영 (다른 기기로 로그인한 첫 진입)
// 2) 이후: 각 lib의 change 이벤트 구독 → 800ms debounce → PATCH로 upload
//    - `applyingRemote` 플래그로 원격 반영 중 이벤트는 무시
//    - 'storage' 이벤트(다른 탭)는 별도 리스너 없음 (그 탭이 이미 upload 했다고 가정)
// 3) 로그아웃 감지 시 debounce 취소 + 리스너 해제
export function PreferencesSyncClient() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let cleanups: Array<() => void> = [];
    let initialized = false;

    async function upload() {
      const patch: PreferencesPatch = readLocalPreferences();
      try {
        await patchMyPreferences(patch);
      } catch {
        // 네트워크/서버 오류는 조용히 무시. localStorage가 여전히 truth이므로
        // 다음 조작 시 재시도됨.
      }
    }

    function scheduleUpload() {
      if (isAnyApplyingRemote()) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void upload();
      }, DEBOUNCE_MS);
    }

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // GET /profiles/me — 프로필 없는 신규 유저는 null. 그 경우엔 sync 스킵
      // (upsertMe가 아직 안 됨. 온보딩 후 다음 진입에서 다시 시도됨).
      const profile = await getMyProfile().catch(() => null);
      if (!profile || cancelled) return;

      if (isDefaultServerPrefs(profile.preferences)) {
        // 서버가 비어있음 → 기존 localStorage 값을 서버로 1회 밀어올림.
        try {
          await patchMyPreferences(readLocalPreferences());
        } catch {}
      } else {
        // 서버 값을 로컬에 반영.
        applyRemotePreferences(profile.preferences);
      }

      if (cancelled) return;
      initialized = true;

      // 자기 탭의 CHANGE 이벤트만 리슨. 'storage' 이벤트(다른 탭 발화)는 스킵 —
      // 그 탭에서 이미 upload 되었다고 가정. subscribe*() 유틸을 안 쓰는 이유가
      // 그 유틸이 'storage'도 함께 리슨하기 때문.
      for (const eventName of CHANGE_EVENTS) {
        window.addEventListener(eventName, scheduleUpload);
        cleanups.push(() => window.removeEventListener(eventName, scheduleUpload));
      }
    }

    void bootstrap();

    // 로그아웃 시 리스너 해제 + 다음 로그인 시 다시 bootstrap.
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        cleanups.forEach((fn) => fn());
        cleanups = [];
        initialized = false;
      } else if (event === 'SIGNED_IN' && !initialized) {
        void bootstrap();
      }
    });

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      cleanups.forEach((fn) => fn());
      authSub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
