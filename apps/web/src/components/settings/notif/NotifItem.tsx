'use client';

import type { ReactNode } from 'react';
import { Switch } from '../../ui/Switch';
import { useNotifPermission } from '../../../lib/notif-permission';

// 알림 설정 창의 항목 한 줄 — 이름 · 설명 · 스위치(바꾸면 바로 저장).
// 브라우저 권한이 없으면 지우지 않고 잠금: 이름 ink-muted · 설명 icon-faint · 스위치 잠김,
// 켜져 있던 값도 잠긴 동안엔 꺼진 모양(실제로 안 오니까 — 권한이 생기면 원래 값으로).
// extra = 켜져 있을 때 줄 아래에 붙는 추가 설정(운동 건너뜀의 며칠째 등).
export function NotifItem({
  title,
  desc,
  enabled,
  onToggle,
  extra,
}: {
  title: string;
  desc: string;
  /** null = 아직 못 읽음(서버 렌더) */
  enabled: boolean | null;
  onToggle: (next: boolean) => void;
  extra?: (locked: boolean) => ReactNode;
}) {
  const permission = useNotifPermission();
  const locked = permission !== 'granted';
  const shown = !locked && !!enabled;
  return (
    <li className="flex flex-col gap-2 border-b border-divider py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-[15px] font-semibold ${locked ? 'text-ink-muted' : 'text-ink-strong'}`}>
            {title}
          </span>
          <span className={`text-[13px] ${locked ? 'text-icon-faint' : 'text-ink-muted'}`}>{desc}</span>
        </div>
        <span className="-my-2 -mr-2">
          <Switch
            label={title}
            checked={shown}
            disabled={locked || enabled === null}
            onChange={onToggle}
          />
        </span>
      </div>
      {extra && enabled ? extra(locked) : null}
    </li>
  );
}
