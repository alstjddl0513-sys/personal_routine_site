import { getBlogPosts, getBlogSources } from '../../lib/api';
import { settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, SectionHead } from './Card';

const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: '2-digit',
  timeZone: 'Asia/Seoul',
});

// "10. 24." → "10.24"
function shortDate(iso: string | null): string {
  if (!iso) return '';
  const parts = dateFmt.formatToParts(new Date(iso));
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return m && d ? `${m}.${d}` : '';
}

export async function BlogSection() {
  const [posts, sources] = await Promise.all([
    settle(getBlogPosts({ limit: 3 })),
    settle(getBlogSources()),
  ]);
  const nameById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return (
    <section aria-labelledby="blog-title" className="flex flex-col gap-1 border-t border-rule pt-6">
      <SectionHead
        id="blog-title"
        title="새로 올라온 기술 블로그"
        aside={<CardLink href="/blog">전체 보기</CardLink>}
      />
      {posts === null ? (
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      ) : posts.length === 0 ? (
        <CardMessage href="/settings/blog-sources" linkLabel="블로그 구독 추가하기">
          아직 수집된 글이 없어요.
        </CardMessage>
      ) : (
        <ul className="flex flex-col">
          {posts.map((p) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-12 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 text-ink hover:text-heading"
              >
                <span className="truncate text-sm text-ink-muted">
                  {nameById.get(p.sourceId) ?? '기술 블로그'}
                </span>
                <span className="truncate font-medium">{p.title}</span>
                <span className="text-sm text-ink-muted">{shortDate(p.publishedAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
