'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// [Google로 계속하기] — 로그인 · 가입 화면 공용. 처음 들어온 사람이면 OAuth 콜백(/auth/callback)이
// 프로필을 만들어 가입까지 끝냄(가입 화면에서 눌러도 같은 길). 로그인 화면에 있던 처리를 그대로 옮김.
export function GoogleButton({
  nextPath = '/today',
  disabled,
  onStart,
  onError,
}: {
  /** 로그인 뒤 갈 곳 — 기본 /today면 콜백에 안 붙임 */
  nextPath?: string;
  disabled?: boolean;
  /** 누르는 순간(부르는 쪽이 버튼들을 잠그게) */
  onStart: () => void;
  /** 시작하지 못했을 때 — 부르는 쪽이 오류 한 줄을 보이고 잠금을 풂 */
  onError: (message: string) => void;
}) {
  async function handleGoogle() {
    onStart();
    try {
      const supabase = createSupabaseBrowserClient();
      // nextPath는 origin/auth/callback으로 넘겨 콜백 라우트에서 다시 활용.
      const callback = new URL('/auth/callback', window.location.origin);
      if (nextPath !== '/today') callback.searchParams.set('next', nextPath);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });
      if (oauthError) {
        onError('Google 로그인을 시작하지 못했어요. 잠시 후 다시 해보세요.');
      }
      // 성공 시 브라우저가 Google로 redirect됨.
    } catch {
      onError('연결이 잠깐 끊겼어요. 잠시 후 다시 해보세요.');
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={disabled}
      className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      <GoogleIcon />
      Google로 계속하기
    </button>
  );
}

// Google 공식 4색 "G" 로고. lucide-react엔 없어 인라인 SVG.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

/** 로그인 · 가입 화면 공용 "또는" 구분선 */
export function OrDivider() {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      또는
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
