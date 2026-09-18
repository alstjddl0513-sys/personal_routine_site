import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listDocuments } from '../../../lib/api';
import { DocumentsManager } from '../../../components/settings/DocumentsManager';

export const metadata = {
  title: '이력서·포폴 관리 · Rally',
};

export default async function DocumentsSettingsPage() {
  const docs = await listDocuments();

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
        <h1 className="text-xl font-semibold">이력서·포폴 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          여러 버전을 저장해두고 지원할 때마다 어떤 걸 낼지 대표를 정해두세요.
          PDF 파일과 외부 링크를 각각 관리할 수 있어요.
        </p>
      </header>

      <DocumentsManager initial={docs} />
    </div>
  );
}
