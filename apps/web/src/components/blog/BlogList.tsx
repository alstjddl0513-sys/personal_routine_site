'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { BlogPost, BlogRefreshResult, BlogSource } from '@repo/shared';
import { refreshBlogPosts } from '../../lib/api';

interface Props {
  posts: BlogPost[];
  sources: BlogSource[];
  activeSourceId: string | null;
}

export function BlogList({ posts, sources, activeSourceId }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshResult, setRefreshResult] = useState<BlogRefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  function pushFilter(sourceId: string | null) {
    const url = sourceId ? `/blog?source=${sourceId}` : '/blog';
    router.push(url);
  }

  function onRefresh() {
    setRefreshResult(null);
    setRefreshError(null);
    startRefresh(async () => {
      try {
        const result = await refreshBlogPosts();
        setRefreshResult(result);
        router.refresh();
      } catch (err) {
        console.error(err);
        setRefreshError('새로고침에 실패했습니다.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SourceChips
          sources={sources}
          activeSourceId={activeSourceId}
          onPick={pushFilter}
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          {isRefreshing ? '수집 중…' : 'RSS 새로고침'}
        </button>
      </div>

      {refreshResult ? (
        <RefreshSummary result={refreshResult} />
      ) : null}
      {refreshError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{refreshError}</span>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {activeSourceId
            ? '이 소스에는 아직 수집된 글이 없습니다.'
            : '아직 수집된 글이 없습니다. "RSS 새로고침"으로 첫 수집을 시작해 보세요.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              sourceName={sourceById.get(p.sourceId)?.name ?? '(삭제됨)'}
            />
          ))}
        </ul>
      )}
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
        <Chip
          key={s.id}
          active={activeSourceId === s.id}
          onClick={() => onPick(s.id)}
          dim={!s.isActive}
        >
          {s.name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  dim,
  onClick,
  children,
}: {
  active: boolean;
  dim?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = 'rounded-full border px-3 py-1 text-xs transition-colors';
  const activeCls =
    'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900';
  const idleCls =
    'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${active ? activeCls : idleCls} ${dim ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  );
}

function PostRow({ post, sourceName }: { post: BlogPost; sourceName: string }) {
  const dateLabel = post.publishedAt
    ? post.publishedAt.slice(0, 10)
    : post.createdAt.slice(0, 10);

  return (
    <li className="rounded-md border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
            {sourceName}
          </span>
          <span className="tabular-nums">{dateLabel}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
            {post.title}
          </h2>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        </div>
        {post.summary ? (
          <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {post.summary}
          </p>
        ) : null}
      </a>
    </li>
  );
}

function RefreshSummary({ result }: { result: BlogRefreshResult }) {
  const hasErrors = result.errors.length > 0;
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${
        hasErrors
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
      }`}
    >
      <div>
        <strong>{result.added}</strong>개 신규 수집 · 소스 {result.processed}개 처리
        {hasErrors ? ` · 실패 ${result.errors.length}개` : null}
      </div>
      {hasErrors ? (
        <ul className="mt-1 list-disc pl-4">
          {result.errors.map((e) => (
            <li key={e.sourceId}>
              {e.name}: {e.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
