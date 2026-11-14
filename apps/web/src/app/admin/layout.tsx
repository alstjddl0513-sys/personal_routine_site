import { notFound } from 'next/navigation';
import { getMyProfile } from '../../lib/api';
import { AdminSubNav } from '../../components/admin/AdminSubNav';

// SSR 권한 게이트. isAdmin false면 404로 존재 자체 은폐 (403보다 정보 노출
// 적음). middleware(proxy.ts)에서 env를 이중 관리하지 않고 여기서 판정.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '관리자 · Rally',
};

// docs/design/rally-admin*.html — 본문 최대 1060px(열 6개 표라 채용 1120보다 좁게).
// 청록(--rally-admin)은 탭 활성 · "관리자" 배지 · 사이드바 줄에만, 채운 버튼은 숲색 그대로.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile?.isAdmin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      {/* 사이드바 [관리자 페이지]로 들어오므로 '설정으로 돌아가기' 링크 없음 */}
      <div className="flex max-w-265 flex-col gap-5 px-4 pt-6 pb-14 md:px-9 md:pt-8">
        <div className="flex flex-col gap-3.5">
          <header className="flex flex-col gap-1.5">
            <h1 className="text-[26px] leading-[1.3] font-bold tracking-[-0.01em] text-ink-strong">
              관리자 페이지
            </h1>
            <p className="text-ink-soft">
              사용자 목록을 살펴보고 공지를 띄우거나 문제 계정을 정리해요.
            </p>
          </header>
          <AdminSubNav />
        </div>

        {children}
      </div>
    </div>
  );
}
