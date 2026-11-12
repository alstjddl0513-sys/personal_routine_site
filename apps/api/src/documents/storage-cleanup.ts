import type { SupabaseClient } from '@supabase/supabase-js';

export const DOCUMENTS_BUCKET = 'documents';
const PAGE = 1000;

// 계정 삭제 전에 그 사용자의 저장소 파일({userId}/{kind}/{documentId}.pdf)을 전부 지움.
// DB의 documents 행은 auth.users CASCADE로 지워지지만 Storage 파일은 안 지워져서
// 계정을 지워도 이력서·포트폴리오 파일이 남던 문제. 폴더를 직접 훑어서
// DB에 없는 파일(업로드 중 끊긴 것 등)까지 같이 지움. 지운 파일 수를 돌려줌.
export async function removeAllUserFiles(
  admin: SupabaseClient,
  userId: string,
  bucket = DOCUMENTS_BUCKET,
): Promise<number> {
  // 내 폴더 바로 아래 = kind 폴더(resume, portfolio …). 혹시 바로 놓인 파일도 함께
  const top = await listAll(admin, bucket, userId);
  const paths: string[] = [];
  for (const entry of top) {
    if (entry.isFolder) {
      const inner = await listAll(admin, bucket, `${userId}/${entry.name}`);
      for (const f of inner)
        if (!f.isFolder) paths.push(`${userId}/${entry.name}/${f.name}`);
    } else {
      paths.push(`${userId}/${entry.name}`);
    }
  }
  for (let i = 0; i < paths.length; i += PAGE) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(paths.slice(i, i + PAGE));
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }
  return paths.length;
}

async function listAll(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<{ name: string; isFolder: boolean }[]> {
  const out: { name: string; isFolder: boolean }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`storage list failed: ${error.message}`);
    // 폴더는 id가 null로 옴
    for (const e of data ?? [])
      out.push({ name: e.name, isFolder: e.id === null });
    if (!data || data.length < PAGE) break;
  }
  return out;
}
