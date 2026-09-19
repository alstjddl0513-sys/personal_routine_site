'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ban, Search, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import {
  type AdminUserRow,
  type AdminUsersPage,
  type BanDurationHours,
} from '@repo/shared';
import {
  banUser,
  deleteUserAsAdmin,
  listAdminUsers,
  unbanUser,
} from '../../lib/api';
import { Select } from '../ui/Select';
import { BanUserModal } from './BanUserModal';
import { DeleteUserAdminModal } from './DeleteUserAdminModal';

const SORT_OPTIONS = [
  { value: 'createdAt', label: '가입일 최신순' },
  { value: 'lastSignInAt', label: '최근 로그인 순' },
];

interface Props {
  initial: AdminUsersPage;
}

// 사용자 목록. 검색·정렬은 서버로 재요청, 페이지 이동도 재요청.
// listAdminUsers 결과의 users가 이미 앱 레벨 필터/정렬을 거친 상태.

export function UsersTable({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<AdminUsersPage>(initial);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastSignInAt'>('createdAt');
  const [error, setError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function refetch(next: {
    page?: number;
    search?: string;
    sortBy?: 'createdAt' | 'lastSignInAt';
  }) {
    setError(null);
    startTransition(async () => {
      try {
        const fresh = await listAdminUsers({
          page: next.page ?? data.page,
          perPage: data.perPage,
          search: next.search ?? search,
          sortBy: next.sortBy ?? sortBy,
        });
        setData(fresh);
      } catch (err) {
        console.error(err);
        setError('목록을 불러오지 못했어요. Supabase Admin API 상태를 확인해주세요.');
      }
    });
  }

  function handleBanConfirm(durationHours: BanDurationHours) {
    if (!banTarget) return;
    const target = banTarget;
    setError(null);
    startTransition(async () => {
      try {
        await banUser(target.id, durationHours);
        setBanTarget(null);
        refetch({});
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('차단에 실패했습니다.');
        setBanTarget(null);
      }
    });
  }

  function handleUnban(row: AdminUserRow) {
    setError(null);
    startTransition(async () => {
      try {
        await unbanUser(row.id);
        refetch({});
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('차단 해제에 실패했습니다.');
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAsAdmin(target.id);
        setDeleteTarget(null);
        refetch({});
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('삭제에 실패했습니다.');
        setDeleteTarget(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') refetch({ search, page: 1 });
            }}
            placeholder="닉네임 · 이메일로 검색"
            className="h-11 w-full rounded border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500 md:h-9 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch({ page: 1 })}
          disabled={isPending}
          className="h-11 rounded border border-transparent bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 md:h-9 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? '불러오는 중…' : '검색'}
        </button>
        <Select
          value={sortBy}
          onChange={(v) => {
            const next = v as 'createdAt' | 'lastSignInAt';
            setSortBy(next);
            refetch({ sortBy: next });
          }}
          options={SORT_OPTIONS}
          disabled={isPending}
          ariaLabel="정렬"
          triggerClassName="h-11 rounded border border-zinc-300 bg-white px-2 text-sm md:h-9 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">닉네임</th>
              <th className="hidden px-3 py-2 text-left md:table-cell">이메일</th>
              <th className="hidden px-3 py-2 text-left lg:table-cell">가입일</th>
              <th className="hidden px-3 py-2 text-left lg:table-cell">최근 로그인</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-500">
                  일치하는 사용자가 없어요.
                </td>
              </tr>
            ) : (
              data.users.map((row) => {
                const banned =
                  row.bannedUntil !== null &&
                  new Date(row.bannedUntil) > new Date();
                return (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {row.nickname ?? <span className="text-zinc-400">—</span>}
                        </div>
                        {row.isAdmin ? (
                          <span
                            title="어드민"
                            className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                          >
                            <Shield className="h-2.5 w-2.5" aria-hidden />
                            관리자
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-400 md:hidden">
                        {row.email ?? '이메일 없음'}
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 text-zinc-600 md:table-cell dark:text-zinc-400">
                      {row.email ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-zinc-500 lg:table-cell">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-zinc-500 lg:table-cell">
                      {row.lastSignInAt ? formatDate(row.lastSignInAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {banned ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <Ban className="h-3 w-3" aria-hidden />
                          차단
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">정상</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {row.isAdmin ? (
                          // 어드민 계정은 차단/삭제 불가 (self-lockout · 상호
                          // 무력화 방지). 서버도 같은 판정으로 거절.
                          <span className="text-xs text-zinc-400" title="어드민 계정은 이 페이지에서 관리할 수 없어요">
                            —
                          </span>
                        ) : (
                          <>
                            {banned ? (
                              <IconButton
                                onClick={() => handleUnban(row)}
                                disabled={isPending}
                                label="차단 해제"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </IconButton>
                            ) : (
                              <IconButton
                                onClick={() => setBanTarget(row)}
                                disabled={isPending}
                                label="차단"
                                danger
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </IconButton>
                            )}
                            <IconButton
                              onClick={() => setDeleteTarget(row)}
                              disabled={isPending}
                              label="강제 탈퇴"
                              danger
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          총 {data.total}명 · {data.page}페이지 (페이지당 {data.perPage})
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => refetch({ page: data.page - 1 })}
            disabled={data.page <= 1 || isPending}
            className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => refetch({ page: data.page + 1 })}
            disabled={data.users.length < data.perPage || isPending}
            className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900"
          >
            다음
          </button>
        </div>
      </div>

      <BanUserModal
        open={!!banTarget}
        target={banTarget}
        pending={isPending}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanTarget(null)}
      />
      <DeleteUserAdminModal
        open={!!deleteTarget}
        target={deleteTarget}
        pending={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-40 ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
