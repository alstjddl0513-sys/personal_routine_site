import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// service_role 키를 쓰는 Admin 클라이언트 팩토리. RLS 우회 + auth.admin
// namespace 사용 가능. 지금 용도는 auth.users 삭제(계정 탈퇴)뿐이지만
// 추가 admin 작업 생기면 여기서 재사용.
//
// SUPABASE_SECRET_KEY는 옵셔널 env로 두고, 쓰는 endpoint(=DELETE /profiles/me)
// 진입 시점에 검증. 미세팅 시 500. 이 서비스가 없어도 나머지 API는 정상.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SECRET_KEY 미설정 — admin 작업(계정 삭제 등) 불가',
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
