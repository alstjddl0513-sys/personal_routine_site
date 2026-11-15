'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import type { AdminUserRow } from '@repo/shared';
import { listAdminUsers } from '../../lib/api';
import { SettingsDialog } from '../settings/SettingsDialog';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  POPOVER_INPUT,
} from '../jobs/cells/popover-style';
import { Checkbox } from './admin-ui';

interface Props {
  open: boolean;
  initialSelected: string[];
  onConfirm: (userIds: string[]) => void;
  onCancel: () => void;
}

// 공지 받는 사람 고르기. 검색 → 목록 → 다중 선택 → 확인. AnnouncementForm에서 호출.
// 데이터 fetch는 listAdminUsers 재활용. 페이지 세션 동안 모듈 캐시에 담아
// 재사용 — 여닫기마다 API 재호출하면 throttle에 걸리고 어드민이 답답함.
// 진짜 최신화가 필요하면 새로고침.

let cachedUsers: AdminUserRow[] | null = null;
let inFlight: Promise<AdminUserRow[]> | null = null;

async function loadUsers(): Promise<AdminUserRow[]> {
  if (cachedUsers) return cachedUsers;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const data = await listAdminUsers({ perPage: 200 });
      cachedUsers = data.users;
      return data.users;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function UserPickerModal({
  open,
  initialSelected,
  onConfirm,
  onCancel,
}: Props) {
  const labelId = useId();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [users, setUsers] = useState<AdminUserRow[]>(cachedUsers ?? []);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // open transition에서 로컬 상태 리셋("adjust during render" 패턴).
  // fetch는 async라 아래 useEffect에서 별도 진행.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSelected(new Set(initialSelected));
      setSearch('');
      setError(null);
      if (cachedUsers) setUsers(cachedUsers);
    }
  }

  useEffect(() => {
    if (!open || cachedUsers) return;
    startTransition(async () => {
      try {
        const fresh = await loadUsers();
        setUsers(fresh);
      } catch (err) {
        console.error(err);
        setError('사용자 목록을 불러오지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }, [open]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          (u.nickname && u.nickname.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)),
      )
    : users;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SettingsDialog
      open={open}
      title="받는 사람 고르기"
      labelId={labelId}
      onClose={onCancel}
      busy={isPending}
      widthClass="md:max-w-115"
      compact
    >
      <span className="relative block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-icon-faint"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="받는 사람 검색"
          placeholder="닉네임 · 이메일로 검색"
          className={`${POPOVER_INPUT} pr-3 pl-9.5 text-[15px]`}
        />
      </span>

      <div className="max-h-65 overflow-y-auto rounded-md border border-divider">
        {error ? (
          <p className="px-4 py-6 text-center text-sm text-alert">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">
            {isPending ? '불러오는 중…' : '일치하는 사용자가 없어요.'}
          </p>
        ) : (
          <ul className="flex flex-col [&>li:last-child>label]:border-b-0">
            {filtered.map((u) => (
              <li key={u.id}>
                <label className="flex min-h-13 cursor-pointer items-center gap-3 border-b border-divider px-3.5 py-2 hover:bg-row-hover">
                  <Checkbox checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-ink">
                      {u.nickname ?? <span className="font-normal text-ink-muted">닉네임 없음</span>}
                    </span>
                    <span className="truncate text-[12.5px] text-ink-muted">{u.email ?? u.id}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-[13.5px] text-ink-muted">
          {selected.size > 0 ? (
            <>
              <strong className="font-semibold text-ink">{selected.size}명 선택됨</strong> ·{' '}
            </>
          ) : null}
          고르지 않으면 전체에게 보내요
        </span>
        <span className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={isPending} className={BUTTON_SECONDARY}>
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm([...selected])}
            disabled={isPending}
            className={BUTTON_PRIMARY}
          >
            확인
          </button>
        </span>
      </div>
    </SettingsDialog>
  );
}
