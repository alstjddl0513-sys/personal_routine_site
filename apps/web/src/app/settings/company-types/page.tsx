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
          채용 리스트에서 회사에 붙일 수 있는 유형(서비스/솔루션/SI…)을 추가·편집·삭제합니다.
          삭제해도 기존 회사에 저장된 값은 유지되며, 선택 목록에서만 사라집니다.
        </p>
      </header>

      <CompanyTypesManager initial={types} />
    </div>
  );
}
