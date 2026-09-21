'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Users, X } from 'lucide-react';
import type { AdminUserRow } from '@repo/shared';
import { listAdminUsers } from '../../lib/api';
import { useOutsideClick } from '../../lib/useOutsideClick';

interface Props {
  open: boolean;
  initialSelected: string[];
  onConfirm: (userIds: string[]) => void;
  onCancel: () => void;
}

// 공지 타겟 지정용. 검색 → 목록 → 다중 선택 → 확인. AnnouncementForm에서 호출.
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
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [users, setUsers] = useState<AdminUserRow[]>(cachedUsers ?? []);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dialogRef, () => !isPending && onCancel(), open);

  // open transition에서 로컬 상태 리셋. React가 derived state 리셋에 공식
  // 권장하는 "adjust during render" 패턴 — ref는 렌더 중 접근 금지라서
  // useState로 이전 값 추적. fetch는 async라 아래 useEffect에서 별도 진행.
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
        setError('사용자 목록을 불러오지 못했어요.');
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPending, onCancel]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-500" aria-hidden />
            <h2 className="text-base font-semibold">타겟 사용자 선택</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="닉네임/이메일 검색"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <p className="p-4 text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">
              {isPending ? '불러오는 중…' : '일치하는 사용자가 없어요.'}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {u.nickname ?? <span className="text-zinc-400">닉네임 없음</span>}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {u.email ?? u.id}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">
            {selected.size === 0
              ? '선택 안 함 (전체 사용자)'
              : `${selected.size}명 선택됨`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onConfirm([...selected])}
              disabled={isPending}
              className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
