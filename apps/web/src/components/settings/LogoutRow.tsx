'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function LogoutRow() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut().catch(() => {});
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
    >
      <LogOut className="h-4 w-4 text-red-500 dark:text-red-400" aria-hidden />
      <div className="flex-1">
        <div className="text-sm font-medium text-red-600 dark:text-red-400">
          로그아웃
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          현재 세션 종료 후 로그인 화면으로 이동.
        </p>
      </div>
    </button>
  );
}
