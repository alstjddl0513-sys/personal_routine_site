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

// 종류 색 — 새 색 없이 캘린더 일정 유형 점 색을 그대로 씀(docs/design/rally-admin*.html):
// 공지 = 기타 회색 · 업데이트 = 시험 파랑 · 점검 = warn 호박 · 이벤트 = 면접 보라. 다크는 토큰이 바꿈.
// text = 아이콘 · 배지 글자, border · dot = 배지 테두리 · 점(색만으로 구분하지 않게 글자 같이).
export const ANNOUNCEMENT_KIND_COLOR: Record<
  AnnouncementKind,
  { text: string; border: string; dot: string }
> = {
  notice: { text: 'text-ev-other', border: 'border-ev-other', dot: 'bg-ev-other' },
  update: { text: 'text-ev-test', border: 'border-ev-test', dot: 'bg-ev-test' },
  maintenance: { text: 'text-warn', border: 'border-warn', dot: 'bg-warn' },
  event: { text: 'text-ev-interview', border: 'border-ev-interview', dot: 'bg-ev-interview' },
};

export function getAnnouncementKindLabel(kind: AnnouncementKind): string {
  return ANNOUNCEMENT_KIND_LABELS[kind];
}
