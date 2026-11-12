import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getBlogSources } from '../../../lib/api';
import { BlogSourcesManager } from '../../../components/settings/BlogSourcesManager';

export const metadata = {
  title: '구독한 블로그 · Rally',
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
        <h1 className="text-xl font-semibold">구독한 블로그</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          구독할 기술 블로그를 골라두면 새 글이 자동으로 모여요.
          잠시 안 볼 블로그는 &lsquo;일시중지&rsquo;로 쉬게 하고, 지우면 그 블로그에서 가져온 글도 같이 사라져요.
        </p>
      </header>

      <BlogSourcesManager initial={sources} />
    </div>
  );
}
