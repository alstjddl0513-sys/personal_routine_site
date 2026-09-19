import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getMyProfile } from '../../lib/api';
import { AdminSubNav } from '../../components/admin/AdminSubNav';

// SSR 권한 게이트. isAdmin false면 404로 존재 자체 은폐 (403보다 정보 노출
// 적음). middleware(proxy.ts)에서 env를 이중 관리하지 않고 여기서 판정.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '관리자 · Rally',
};

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
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          설정으로 돌아가기
        </Link>
        <h1 className="text-xl font-semibold">관리자</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          사용자 목록을 살펴보고 공지를 띄우거나 문제 계정을 정리해요.
        </p>
      </header>

      <AdminSubNav />

      {children}
    </div>
  );
}
