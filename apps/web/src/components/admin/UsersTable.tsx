'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Search, UserX } from 'lucide-react';
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
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  POPOVER_INPUT,
  POPOVER_INPUT_BASE,
} from '../jobs/cells/popover-style';
import { RowAction } from '../settings/lists/ListCard';
import { AdminError, DotBadge, formatDotDate, formatDotDateTime } from './admin-ui';
import { BanUserModal } from './BanUserModal';
import { DeleteUserAdminModal } from './DeleteUserAdminModal';

const SORT_OPTIONS = [
  { value: 'createdAt', label: '가입일 최신순' },
  { value: 'lastSignInAt', label: '최근 로그인 순' },
];

interface Props {
  initial: AdminUsersPage;
}

// 사용자 목록 (docs/design/rally-admin*.html). 검색·정렬은 서버로 재요청, 페이지 이동도 재요청.
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
        const query = {
          perPage: data.perPage,
          search: next.search ?? search,
          sortBy: next.sortBy ?? sortBy,
        };
        let fresh = await listAdminUsers({ ...query, page: next.page ?? data.page });
        // 마지막 쪽의 마지막 사람을 지우면 빈 쪽이 됨 → 남은 마지막 쪽으로
        if (fresh.users.length === 0 && fresh.page > 1 && fresh.total > 0) {
          fresh = await listAdminUsers({
            ...query,
            page: Math.ceil(fresh.total / fresh.perPage),
          });
        }
        setData(fresh);
      } catch (err) {
        console.error(err);
        setError('목록을 불러오지 못했어요. 잠시 후 다시 해보세요.');
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
        setError('차단하지 못했어요. 잠시 후 다시 해보세요.');
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
        setError('차단을 풀지 못했어요. 잠시 후 다시 해보세요.');
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
        setError('계정을 삭제하지 못했어요. 잠시 후 다시 해보세요.');
        setDeleteTarget(null);
      }
    });
  }

  // total = 검색 결과 수(서버가 전체에서 검색 · 정렬 후 자름). 0명이어도 1쪽
  const pageCount = Math.max(1, Math.ceil(data.total / data.perPage));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="relative block max-w-105 min-w-0 flex-[1_1_320px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-icon-faint"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') refetch({ search, page: 1 });
            }}
            aria-label="사용자 검색"
            placeholder="닉네임 · 이메일로 검색"
            className={`${POPOVER_INPUT} pr-3 pl-9.5 text-[15px]`}
          />
        </span>
        <button
          type="button"
          onClick={() => refetch({ page: 1 })}
          disabled={isPending}
          className={BUTTON_PRIMARY}
        >
          검색
        </button>
        <span className="flex-auto" />
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
          tone="rally"
          triggerSuffix={<ChevronDown className="ml-auto h-4 w-4 text-ink-muted" aria-hidden />}
          triggerClassName={`${POPOVER_INPUT_BASE} cursor-pointer gap-2 px-3 text-sm`}
        />
      </div>

      <AdminError message={error} />

      {/* 표는 데스크톱 기준 고정 열 — 좁은 화면은 가로로 밀어 봄 */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <div role="table" aria-label="사용자" className="min-w-205">
          <div role="row" className={`${GRID} min-h-10 border-b border-divider bg-thead text-[13px] font-semibold text-ink-soft`}>
            <span role="columnheader">닉네임</span>
            <span role="columnheader">이메일</span>
            <span role="columnheader" className="text-center">가입일</span>
            <span role="columnheader" className="text-center">최근 로그인</span>
            <span role="columnheader" className="text-center">상태</span>
            <span role="columnheader" className="text-center">관리</span>
          </div>
          {data.users.length === 0 ? (
            <p className="px-4 py-13 text-center text-[15px] text-ink-soft">일치하는 사용자가 없어요.</p>
          ) : (
            data.users.map((row) => (
              <UserRow
                key={row.id}
                row={row}
                pending={isPending}
                onBan={() => setBanTarget(row)}
                onUnban={() => handleUnban(row)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[13.5px] text-ink-muted">
          총 <strong className="font-semibold text-ink">{data.total}명</strong> · {data.page} / {pageCount}쪽
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch({ page: data.page - 1 })}
            disabled={data.page <= 1 || isPending}
            className={`${BUTTON_SECONDARY} gap-1.5 pr-3.5 pl-2.5 disabled:cursor-default disabled:border-divider disabled:text-icon-faint disabled:opacity-100`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            이전
          </button>
          <button
            type="button"
            onClick={() => refetch({ page: data.page + 1 })}
            disabled={data.page >= pageCount || isPending}
            className={`${BUTTON_SECONDARY} gap-1.5 pr-2.5 pl-3.5 disabled:cursor-default disabled:border-divider disabled:text-icon-faint disabled:opacity-100`}
          >
            다음
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </span>
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

// 닉네임 172 · 이메일 남는 폭 · 가입일 104 · 최근 로그인 144 · 상태 96 · 관리 92
const GRID =
  'grid grid-cols-[172px_minmax(180px,1.5fr)_104px_144px_96px_92px] items-center gap-x-3.5 px-4';

// 영구 차단은 서버가 876000시간(100년) 뒤로 잡음 — 50년 넘으면 '영구'로 읽음
const PERMANENT_AFTER_MS = 50 * 365 * 24 * 60 * 60 * 1000;

function UserRow({
  row,
  pending,
  onBan,
  onUnban,
  onDelete,
}: {
  row: AdminUserRow;
  pending: boolean;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
}) {
  const until = row.bannedUntil ? new Date(row.bannedUntil) : null;
  // Date.now()는 렌더 중 금지(react-hooks/purity) — 예전처럼 new Date()와 비교
  const now = new Date();
  const banned = until !== null && until > now;
  const name = row.nickname ?? row.email ?? '이 사용자';
  return (
    <div
      role="row"
      className={`${GRID} min-h-14 border-b border-divider py-2 text-[13.5px] text-ink last:border-b-0 hover:bg-row-hover`}
    >
      <span role="cell" className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-semibold">
          {row.nickname ?? <span className="font-normal text-icon-faint">—</span>}
        </span>
        {row.isAdmin ? (
          <DotBadge text="text-admin" border="border-admin">
            관리자
          </DotBadge>
        ) : null}
      </span>
      <span role="cell" className="min-w-0">
        {row.email ? (
          <span className="block truncate text-ink-soft" title={row.email}>
            {row.email}
          </span>
        ) : (
          <span className="text-icon-faint">—</span>
        )}
      </span>
      <span role="cell" className="text-center">{formatDotDate(row.createdAt)}</span>
      <span role="cell" className="text-center">
        {row.lastSignInAt ? formatDotDateTime(row.lastSignInAt) : <span className="text-icon-faint">—</span>}
      </span>
      <span role="cell" className="flex justify-center">
        {banned ? (
          <DotBadge text="text-alert" border="border-alert">
            차단
          </DotBadge>
        ) : (
          <span className="text-ink-muted">정상</span>
        )}
      </span>
      <span role="cell" className="-mx-1.5 flex justify-center gap-0.5">
        {row.isAdmin ? (
          // 관리자 계정은 차단/삭제 불가 (self-lockout · 상호 무력화 방지). 서버도 같은 판정으로 거절.
          <span className="text-[13px] text-icon-faint" title="관리자 계정은 이 페이지에서 관리할 수 없어요">
            —
          </span>
        ) : (
          <>
            {banned ? (
              <RowAction label={`${name} 차단 해제`} title="차단 해제" onClick={onUnban} disabled={pending}>
                <CircleCheck className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
              </RowAction>
            ) : (
              <RowAction label={`${name} 차단`} title="차단" onClick={onBan} disabled={pending}>
                <Ban className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
              </RowAction>
            )}
            <RowAction label={`${name} 강제 탈퇴`} title="강제 탈퇴" onClick={onDelete} disabled={pending}>
              <UserX className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
            </RowAction>
          </>
        )}
      </span>
      {banned && until ? (
        <span className="col-span-full mt-0.5 text-[12.5px] text-ink-muted">
          {until.getTime() - now.getTime() > PERMANENT_AFTER_MS ? '영구 차단' : `${formatDotDate(row.bannedUntil!)}까지 차단`}
        </span>
      ) : null}
    </div>
  );
}
