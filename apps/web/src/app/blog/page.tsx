import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { getBlogPosts, getBlogSources } from '../../lib/api';
import { BlogList } from '../../components/blog/BlogList';

export const metadata = {
  title: '기술 블로그 · Rally',
};

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function BlogPage({
  searchParams,
}: PageProps<'/blog'>) {
  const sp = await searchParams;
  const sourceParam = first(sp.source);
  const activeSourceId = sourceParam ?? null;

  const [posts, sources] = await Promise.all([
    getBlogPosts({ sourceId: activeSourceId ?? undefined, limit: 50 }),
    getBlogSources(true),
  ]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">기술 블로그</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            등록된 소스의 RSS를 주기적으로 수집.
          </p>
        </div>
        <Link
          href="/settings/blog-sources"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          소스 관리
        </Link>
      </header>

      <BlogList posts={posts} sources={sources} activeSourceId={activeSourceId} />
    </div>
  );
}
