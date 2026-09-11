import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getMyProfile, upsertMyProfile } from '@/lib/api';
import { randomNickname } from '@/lib/nickname';

// Supabase OAuth PKCE 콜백. provider(구글 등)가 Supabase로 code를 넘겨주면
// Supabase가 다시 이 라우트로 redirect. exchangeCodeForSession으로 세션
// 쿠키를 세팅한 뒤, 최초 로그인이면 랜덤 닉네임으로 profile 자동 생성 후
// next(기본 /jobs)로 이동. 실패는 /login?error=oauth로 통합.

const MAX_NICKNAME_RETRIES = 5;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  // open-redirect 방지: 상대 경로만 허용.
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/jobs';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // 최초 OAuth 로그인이면 profile row가 없음. 이메일 가입은 signup에서
  // 사용자가 직접 세팅하지만 OAuth는 그 단계가 없어 랜덤 닉네임 부여
  // (사용자는 이후 /settings/NicknameRow에서 자유 변경). UNIQUE 충돌은
  // 재시도로 대응. 재시도가 다 실패해도 세션은 살아있어 사용자가 수동
  // 재시도 가능하므로 그대로 진행.
  try {
    const existing = await getMyProfile();
    if (!existing) {
      for (let i = 0; i < MAX_NICKNAME_RETRIES; i++) {
        try {
          await upsertMyProfile(randomNickname());
          break;
        } catch (err) {
          if (i === MAX_NICKNAME_RETRIES - 1) {
            console.error(
              '[auth/callback] nickname collision retries exhausted',
              err,
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('[auth/callback] profile ensure failed', err);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
