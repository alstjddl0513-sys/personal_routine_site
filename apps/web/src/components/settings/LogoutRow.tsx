'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 설정 맨 아래 왼쪽 [로그아웃] — 계정 삭제(오른쪽 끝)와 멀리
export function LogoutRow() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut().catch(() => {});
    router.replace('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={BUTTON_SECONDARY}>
      로그아웃
    </button>
  );
}
