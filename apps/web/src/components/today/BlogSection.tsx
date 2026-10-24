import { getBlogPosts, getBlogSources } from '../../lib/api';
import { settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, TodayCard } from './Card';

export async function BlogSection() {
  const [posts, sources] = await Promise.all([
    settle(getBlogPosts({ limit: 3 })),
    settle(getBlogSources()),
  ]);
  const nameById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return (
    <TodayCard
      id="blog-title"
      title="새로 올라온 기술 블로그"
      className="gap-3"
      aside={<CardLink href="/blog">블로그 →</CardLink>}
    >
      {posts === null ? (
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      ) : posts.length === 0 ? (
        <CardMessage href="/blog" linkLabel="블로그 구독 추가하기">
          아직 수집된 글이 없어요.
        </CardMessage>
      ) : (
        <div className="flex flex-wrap gap-3">
          {posts.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5 rounded-[14px] bg-surface-muted p-4 text-ink hover:ring-1 hover:ring-line"
            >
              <span className="text-xs font-bold text-link">
                {nameById.get(p.sourceId) ?? '기술 블로그'}
              </span>
              <span className="line-clamp-2 font-medium">{p.title}</span>
            </a>
          ))}
        </div>
      )}
    </TodayCard>
  );
}
