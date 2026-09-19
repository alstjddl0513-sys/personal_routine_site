import {
  Info,
  Megaphone,
  PartyPopper,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  ANNOUNCEMENT_KIND_LABELS,
  type AnnouncementKind,
} from '@repo/shared';

// kind별 아이콘/색 매핑. NotifBell 드로어와 어드민 매니저가 공용.

export const ANNOUNCEMENT_KIND_ICON: Record<AnnouncementKind, LucideIcon> = {
  notice: Info,
  update: Megaphone,
  maintenance: Wrench,
  event: PartyPopper,
};

// (tailwind 다크모드 대응 클래스 하나로 묶음)
export const ANNOUNCEMENT_KIND_COLOR: Record<AnnouncementKind, string> = {
  notice: 'text-zinc-500 dark:text-zinc-400',
  update: 'text-sky-600 dark:text-sky-400',
  maintenance: 'text-amber-600 dark:text-amber-400',
  event: 'text-fuchsia-600 dark:text-fuchsia-400',
};

export function getAnnouncementKindLabel(kind: AnnouncementKind): string {
  return ANNOUNCEMENT_KIND_LABELS[kind];
}
