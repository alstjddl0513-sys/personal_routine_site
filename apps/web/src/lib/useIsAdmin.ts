'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from './supabase/client';
import { getMyProfile } from './api';

// 관리자 여부 — 사이드바 '관리자 페이지' 줄과 모바일 더보기 시트가 같이 씀. 로그인/로그아웃 때마다 다시 확인.
// 링크를 보일지만 정함 — 실제 API는 AdminGuard가 다시 검사해서 클라 조작은 의미 없음.
// 둘 다 마운트돼도 profile 요청은 한 번만 가게, 같은 사용자면 진행 중·끝난 promise를 같이 씀(실패하면 비움).
let shared: { userId: string; p: Promise<boolean> } | null = null;

function checkAdmin(userId: string): Promise<boolean> {
  if (shared?.userId === userId) return shared.p;
  const entry = {
    userId,
    p: getMyProfile()
      .then((profile) => profile?.isAdmin ?? false)
      .catch(() => {
        if (shared === entry) shared = null;
        return false;
      }),
  };
  shared = entry;
  return entry.p;
}

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        shared = null;
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const admin = await checkAdmin(user.id);
      if (!cancelled) setIsAdmin(admin);
    }

    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
