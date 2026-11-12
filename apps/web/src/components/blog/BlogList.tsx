'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, RefreshCw, X } from 'lucide-react';
import type { BlogPost, BlogRefreshResult, BlogSource } from '@repo/shared';
import { getBlogPosts, refreshBlogPosts } from '../../lib/api';
import { BLOG_PAGE_SIZE } from '../../lib/blog';
import { useBlogLastSeen, useBlogRead } from '../../lib/blog-local';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';

interface Props {
  posts: BlogPost[];
  /** 꺼둔 블로그 포함(꺼둔 블로그 예전 글의 이름 표시용). 칩은 켜둔 것만 */
  sources: BlogSource[];
  activeSourceId: string | null;
}

// 테두리 버튼 — 가져오는 중·불러오는 중엔 테두리 divider · 글자 ink-muted
const OUTLINE_BTN =
  'inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-btn-border bg-btn-bg px-4 text-sm text-btn-fg hover:border-heading disabled:cursor-default disabled:border-divider disabled:text-ink-muted disabled:hover:border-divider';
const SPIN = 'animate-spin motion-reduce:animate-none';
// 성공·새 글 없음 결과 줄이 머무는 시간
const RESULT_MS = 5000;

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

type Result = { kind: 'done'; data: BlogRefreshResult } | { kind: 'error' };

// 성공·새 글 없음(조용한 결과) — 5초 뒤·칩 바꾸면 사라짐. 실패는 ✕나 다시 가져올 때까지
function isQuiet(r: Result): boolean {
  return r.kind === 'done' && r.data.errors.length === 0;
}

export function BlogList({ posts, sources, activeSourceId }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  // 다른 칩을 누르면 성공·새 글 없음 줄은 바로 사라짐
  const [resultSource, setResultSource] = useState(activeSourceId);
  if (resultSource !== activeSourceId) {
    setResultSource(activeSourceId);
    if (result && isQuiet(result)) setResult(null);
  }
  // 성공·새 글 없음은 5초 뒤 사라짐
  useEffect(() => {
    if (!result || !isQuiet(result)) return;
    const t = window.setTimeout(() => setResult(null), RESULT_MS);
    return () => window.clearTimeout(t);
  }, [result]);

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
  const [moreError, setMoreError] = useState(false);
  const all = more.base === posts ? [...posts, ...more.items] : posts;

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const activeSources = sources.filter((s) => s.isActive);
  // 새 글 = 지난 방문 뒤에 가져온 글, 읽은 글 = 눌러본 글(둘 다 이 브라우저에만 기억)
  const lastSeen = useBlogLastSeen();
  const { isRead, markRead } = useBlogRead();

  function pushFilter(sourceId: string | null) {
    router.push(sourceId ? `/blog?source=${sourceId}` : '/blog');
  }

  function onRefresh() {
    setResult(null);
    startRefresh(async () => {
      try {
        setResult({ kind: 'done', data: await refreshBlogPosts() });
        router.refresh();
      } catch (err) {
        console.error(err);
        setResult({ kind: 'error' });
      }
    });
  }

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const next = await getBlogPosts({
        sourceId: activeSourceId ?? undefined,
        limit: BLOG_PAGE_SIZE,
        offset: all.length,
      });
      setMore((cur) => ({ ...cur, items: [...cur.items, ...next], done: next.length < BLOG_PAGE_SIZE }));
    } catch (err) {
      console.error(err);
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const refreshButton = (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      className={OUTLINE_BTN}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? SPIN : ''}`} aria-hidden />
      {isRefreshing ? '가져오는 중…' : '새 글 가져오기'}
    </button>
  );

  // 구독한 블로그가 없음 — 칩 줄·가져오기 없이 카드 하나
  if (activeSources.length === 0 && all.length === 0) {
    return (
      <EmptyCard message="아직 구독한 블로그가 없어요.">
        <Link href="/settings/blog-sources" className={BUTTON_PRIMARY}>
          블로그 추가하기 ›
        </Link>
      </EmptyCard>
    );
  }

  return (
    <>
      {/* 칩이 몇 줄이 되든 [새 글 가져오기]는 첫 줄 오른쪽 */}
      <div className="flex items-start gap-4">
        <SourceChips sources={activeSources} activeSourceId={activeSourceId} onPick={pushFilter} />
        <span className="ml-auto">{refreshButton}</span>
      </div>

      {result ? <ResultLine result={result} onClose={() => setResult(null)} /> : null}

      {all.length === 0 ? (
        activeSourceId ? (
          <EmptyCard message="이 블로그에서 새 글을 아직 못 찾았어요.">
            <button type="button" onClick={() => pushFilter(null)} className={OUTLINE_BTN}>
              전체 보기
            </button>
          </EmptyCard>
        ) : (
          <EmptyCard message="아직 가져온 글이 없어요.">{refreshButton}</EmptyCard>
        )
      ) : (
        <section
          aria-label="글 목록"
          className={`w-full rounded-lg border border-line bg-surface px-6 pt-1.5 ${
            more.done ? 'pb-1.5' : 'pb-4.5'
          }`}
        >
          <ul>
            {all.map((p) => {
              const read = isRead(p.id);
              return (
                <li key={p.id} className="border-b border-divider last:border-b-0">
                  <PostRow
                    post={p}
                    sourceName={sourceById.get(p.sourceId)?.name ?? null}
                    isNew={!!lastSeen && p.createdAt > lastSeen && !read}
                    read={read}
                    onOpen={() => markRead(p.id)}
                  />
                </li>
              );
            })}
          </ul>
          {more.done ? null : (
            <div className="flex flex-col items-center gap-2 border-t border-divider pt-3.5">
              {moreError ? (
                <p role="alert" className="text-sm text-alert">
                  더 불러오지 못했어요. 잠시 후 다시 해보세요.
                </p>
              ) : null}
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className={OUTLINE_BTN}
              >
                {loadingMore ? <RefreshCw className={`h-4 w-4 ${SPIN}`} aria-hidden /> : null}
                {loadingMore ? '불러오는 중…' : moreError ? '다시 시도' : '더 보기'}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function EmptyCard({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-3.5 rounded-lg border border-line bg-surface px-6 py-11 text-center">
      <p className="text-ink-soft">{message}</p>
      {children}
    </div>
  );
}

// 칩 — 학습 페이지 카테고리 칩과 같은 모양. 많으면 칩만 줄바꿈(접기·가로 스크롤 X)
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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 cursor-pointer items-center rounded-[18px] px-3.5 text-sm ${
        active
          ? 'bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : 'bg-surface font-medium text-ink-soft shadow-[inset_0_0_0_1px_var(--rally-btn-border)] hover:bg-row-hover'
      }`}
    >
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
  /** null = 지운 블로그 */
  sourceName: string | null;
  isNew: boolean;
  read: boolean;
  onOpen: () => void;
}) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      onAuxClick={onOpen}
      className="group -mx-4 grid grid-cols-[116px_minmax(0,1fr)_128px] items-start gap-5 rounded-md px-4 py-3.5 outline-none hover:bg-row-hover focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]"
    >
      {sourceName ? (
        <span className="truncate text-sm font-semibold text-ink-soft">{sourceName}</span>
      ) : (
        <span className="text-sm text-ink-muted">지운 블로그</span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className={`max-w-180 text-base leading-normal font-semibold ${read ? 'text-ink-faint' : 'text-ink-strong'}`}>
          {isNew ? (
            <span className="mr-2 inline-flex items-center gap-1 align-[1px] text-xs font-bold text-heading">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              새 글
            </span>
          ) : null}
          {/* 밑줄은 제목 글자에만(새 글 표시엔 X) */}
          <span className="underline-offset-3 group-hover:underline">{post.title}</span>
        </span>
        {post.summary ? (
          <span className={`mt-1 line-clamp-2 max-w-180 text-sm leading-[1.55] ${read ? 'text-ink-faint' : 'text-ink-soft'}`}>
            {post.summary}
          </span>
        ) : null}
      </span>
      <span className="relative flex flex-col items-end gap-1 pr-5 text-right">
        <span className="text-[13px] text-ink-muted tabular-nums">{formatDate(post.publishedAt ?? post.createdAt)}</span>
        {read ? (
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <Check className="h-3 w-3" aria-hidden />
            읽음
          </span>
        ) : null}
        {/* 새 탭 아이콘 — 날짜 오른쪽 자리(pr-5)를 늘 비워둬서 hover해도 날짜가 안 움직이고, hover 배경 안에 들어옴 */}
        <ExternalLink
          aria-hidden
          className="absolute top-0.5 right-0 h-3.5 w-3.5 text-ink-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </span>
    </a>
  );
}

// 결과 줄 — 배경 없는 한 줄. 서버 오류 원문은 안 보이고(서버 로그에만) 실패한 블로그 이름만
function ResultLine({ result, onClose }: { result: Result; onClose: () => void }) {
  if (result.kind === 'error') {
    return (
      <FailLine onClose={onClose}>
        <span className="text-alert">새 글을 가져오지 못했어요. 잠시 후 다시 해보세요.</span>
      </FailLine>
    );
  }
  const { added, errors } = result.data;
  const addedText = (
    <>
      새 글 <strong className="font-bold text-ink-strong">{added}개</strong>를 가져왔어요.
    </>
  );
  if (errors.length > 0) {
    return (
      <FailLine onClose={onClose}>
        {/* 성공한 몫도 알려줌 — 가져온 게 0개면 실패 문장만 */}
        {added > 0 ? <span className="text-ink-soft">{addedText} </span> : null}
        <span className="text-alert">
          {errors.length}개 블로그에서 가져오지 못했어요: {errors.map((e) => e.name).join(', ')}. 잠시 후 다시
          해보세요.
        </span>
      </FailLine>
    );
  }
  return (
    <p role="status" className="flex min-h-8 items-center gap-2 text-sm">
      {added > 0 ? (
        <>
          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="text-ink-soft">{addedText}</span>
        </>
      ) : (
        <span className="text-ink-muted">새로 올라온 글이 없어요.</span>
      )}
    </p>
  );
}

function FailLine({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="alert" className="flex min-h-8 items-center gap-2 text-sm">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
      <p className="min-w-0 flex-1">{children}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
