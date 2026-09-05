import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getBlogSources } from '../../../lib/api';
import { BlogSourcesManager } from '../../../components/settings/BlogSourcesManager';

export const metadata = {
  title: '블로그 소스 관리 · Rally',
};

export default async function BlogSourcesSettingsPage() {
  const sources = await getBlogSources(true);

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
        <h1 className="text-xl font-semibold">블로그 소스 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          기술 블로그 페이지에 나오는 RSS 소스를 추가·편집·일시중지·삭제합니다.
          삭제하면 이 소스에서 수집된 글도 함께 정리됩니다.
        </p>
      </header>

      <BlogSourcesManager initial={sources} />
    </div>
  );
}
