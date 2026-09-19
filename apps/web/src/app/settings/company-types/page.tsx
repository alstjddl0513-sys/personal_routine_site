import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCompanyTypes } from '../../../lib/api';
import { CompanyTypesManager } from '../../../components/settings/CompanyTypesManager';

export const metadata = {
  title: '기업 유형 관리 · Rally',
};

export default async function CompanyTypesSettingsPage() {
  const types = await getCompanyTypes();

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
        <h1 className="text-xl font-semibold">기업 유형 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          회사에 붙일 유형을 취향대로 정리해두세요.
          지워도 이미 그 유형을 쓰던 회사에는 그대로 남고, 새로 고를 목록에서만 사라져요.
        </p>
      </header>

      <CompanyTypesManager initial={types} />
    </div>
  );
}
