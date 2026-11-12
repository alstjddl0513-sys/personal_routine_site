'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { BlogPost, BlogRefreshResult, BlogSource } from '@repo/shared';
import { getBlogPosts, refreshBlogPosts } from '../../lib/api';
import { BLOG_PAGE_SIZE } from '../../lib/blog';
import { useBlogLastSeen, useBlogRead } from '../../lib/blog-local';


interface Props {
  posts: BlogPost[];
  /** 꺼둔 블로그 포함(꺼둔 블로그 예전 글의 이름 표시용). 칩은 켜둔 것만 */
  sources: BlogSource[];
  activeSourceId: string | null;
}

// 서울 날짜 — 올해면 "11월 5일", 아니면 "2025년 3월 2일"
const seoulParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
function seoulYMD(d: Date): [number, number, number] {
  const p = seoulParts.formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return [get('year'), get('month'), get('day')];
}
function formatDate(iso: string): string {
  const [y, m, d] = seoulYMD(new Date(iso));
  const [thisYear] = seoulYMD(new Date());
  return y === thisYear ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
}

export function BlogList({ posts, sources, activeSourceId }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshResult, setRefreshResult] = useState<BlogRefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // 더 보기 — 서버가 준 첫 묶음 뒤에 이어 붙임. 필터·새로고침으로 첫 묶음이 바뀌면 처음부터
  const [more, setMore] = useState<{ base: BlogPost[]; items: BlogPost[]; done: boolean }>({
    base: posts,
    items: [],
    done: posts.length < BLOG_PAGE_SIZE,
  });
  if (more.base !== posts) {
    setMore({ base: posts, items: [], done: posts.length < BLOG_PAGE_SIZE });
  }
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const all = more.base === posts ? [...posts, ...more.items] : posts;

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  // 새 글 = 지난 방문 뒤에 가져온 글, 읽은 글 = 눌러본 글(둘 다 이 브라우저에만 기억)
  const lastSeen = useBlogLastSeen();
  const { isRead, markRead } = useBlogRead();
  const activeSources = sources.filter((s) => s.isActive);

  function pushFilter(sourceId: string | null) {
    router.push(sourceId ? `/blog?source=${sourceId}` : '/blog');
  }

  function onRefresh() {
    setRefreshResult(null);
    setRefreshError(null);
    startRefresh(async () => {
      try {
        setRefreshResult(await refreshBlogPosts());
        router.refresh();
      } catch (err) {
        console.error(err);
        setRefreshError('새 글을 가져오지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await getBlogPosts({
        sourceId: activeSourceId ?? undefined,
        limit: BLOG_PAGE_SIZE,
        offset: all.length,
      });
      setMore((cur) => ({ ...cur, items: [...cur.items, ...next], done: next.length < BLOG_PAGE_SIZE }));
    } catch (err) {
      console.error(err);
      setMoreError('더 불러오지 못했어요. 잠시 후 다시 해보세요.');
    } finally {
      setLoadingMore(false);
    }
  }

  // 켜둔 블로그가 하나도 없음 — 새 글 가져오기를 눌러도 올 게 없으니 추가하러 가게
  if (activeSources.length === 0 && all.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        <p>아직 구독한 블로그가 없어요.</p>
        <Link
          href="/settings/blog-sources"
          className="text-zinc-800 underline underline-offset-2 hover:text-zinc-950 dark:text-zinc-200"
        >
          블로그 추가하기 ›
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SourceChips sources={activeSources} activeSourceId={activeSourceId} onPick={pushFilter} />
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          {isRefreshing ? '가져오는 중…' : '새 글 가져오기'}
        </button>
      </div>

      {refreshResult ? <RefreshSummary result={refreshResult} /> : null}
      {refreshError ? <ErrorLine message={refreshError} /> : null}

      {all.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {activeSourceId
            ? '이 블로그에서 새 글을 아직 못 찾았어요.'
            : '아직 가져온 글이 없어요. 새 글을 가져와보세요.'}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {all.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                sourceName={sourceById.get(p.sourceId)?.name ?? '지운 블로그'}
                isNew={!!lastSeen && p.createdAt > lastSeen && !isRead(p.id)}
                read={isRead(p.id)}
                onOpen={() => markRead(p.id)}
              />
            ))}
          </ul>
          {moreError ? <ErrorLine message={moreError} /> : null}
          {more.done ? null : (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="self-center rounded-md border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {loadingMore ? '불러오는 중…' : '더 보기'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function SourceChips({
  sources,
  activeSourceId,
  onPick,
}: {
  sources: BlogSource[];
  activeSourceId: string | null;
  onPick: (sourceId: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={!activeSourceId} onClick={() => onPick(null)}>
        전체
      </Chip>
      {sources.map((s) => (
        <Chip key={s.id} active={activeSourceId === s.id} onClick={() => onPick(s.id)}>
          {s.name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = 'rounded-full border px-3 py-1 text-xs transition-colors';
  const activeCls =
    'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900';
  const idleCls =
    'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800';
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${base} ${active ? activeCls : idleCls}`}>
      {children}
    </button>
  );
}

function PostRow({
  post,
  sourceName,
  isNew,
  read,
  onOpen,
}: {
  post: BlogPost;
  sourceName: string;
  isNew: boolean;
  read: boolean;
  onOpen: () => void;
}) {
  return (
    <li className="rounded-md border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        onAuxClick={onOpen}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{sourceName}</span>
          <span className="tabular-nums">{formatDate(post.publishedAt ?? post.createdAt)}</span>
          {isNew ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              새 글
            </span>
          ) : null}
          {read ? <span className="sr-only">읽음</span> : null}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h2
            className={`text-sm leading-snug font-medium ${
              read ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {post.title}
          </h2>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        </div>
        {post.summary ? (
          <p className={`line-clamp-2 text-xs ${read ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {post.summary}
          </p>
        ) : null}
      </a>
    </li>
  );
}

// 가져오기 결과 — 서버 오류 원문은 안 보이고(서버 로그에만) 실패한 블로그 이름만
function RefreshSummary({ result }: { result: BlogRefreshResult }) {
  const failed = result.errors.map((e) => e.name);
  return (
    <div
      role="status"
      className={`rounded-md border px-3 py-2 text-xs ${
        failed.length > 0
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
      }`}
    >
      <p>{result.added > 0 ? `새 글 ${result.added}개를 가져왔어요.` : '새로 올라온 글이 없어요.'}</p>
      {failed.length > 0 ? (
        <p className="mt-0.5">
          {failed.length}개 블로그에서 가져오지 못했어요: {failed.join(', ')}. 잠시 후 다시 해보세요.
        </p>
      ) : null}
    </div>
  );
}
