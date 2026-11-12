import { Suspense } from 'react';
import Link from 'next/link';
import { getBlogPosts, getBlogSources } from '../../lib/api';
import { BLOG_PAGE_SIZE } from '../../lib/blog';
import { BlogList } from '../../components/blog/BlogList';
import { Skeleton } from '../../components/Skeleton';
import { BUTTON_SECONDARY } from '../../components/jobs/cells/popover-style';

export const metadata = {
  title: '기술 블로그 · Rally',
};

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function BlogPage({ searchParams }: PageProps<'/blog'>) {
  const sp = await searchParams;
  const activeSourceId = first(sp.source) ?? null;

  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-4 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <BlogHeader />
        <Suspense fallback={<BlogSkeleton />}>
          <BlogContent activeSourceId={activeSourceId} />
        </Suspense>
      </div>
    </div>
  );
}

function BlogHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">기술 블로그</h1>
        <p className="text-[15px] text-ink-soft">
          구독한 블로그의 새 글이에요. 매일 오전 8시·오후 8시에 자동으로 가져와요.
        </p>
      </div>
      <Link href="/settings/blog-sources" className={BUTTON_SECONDARY}>
        구독 관리
      </Link>
    </header>
  );
}

async function BlogContent({ activeSourceId }: { activeSourceId: string | null }) {
  const [posts, sources] = await Promise.all([
    getBlogPosts({ sourceId: activeSourceId ?? undefined, limit: BLOG_PAGE_SIZE }),
    getBlogSources(true),
  ]);

  return <BlogList posts={posts} sources={sources} activeSourceId={activeSourceId} />;
}

function BlogSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-14 rounded-[18px]" />
        <Skeleton className="h-9 w-20 rounded-[18px]" />
        <Skeleton className="h-9 w-16 rounded-[18px]" />
        <Skeleton className="h-9 w-20 rounded-[18px]" />
      </div>
      <Skeleton className="h-96 w-full" />
    </>
  );
}
