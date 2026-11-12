import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// 설정 줄 공통 — [아이콘 24px | 이름 + 설명 | 줄 끝]. 줄 끝 모양으로 동작을 구분:
// › = 다른 화면(줄 전체 링크) · 테두리 버튼 = 창이 열림 · 입력칸·세그먼트 = 그 자리에서 고침.
// -mx-3 으로 hover 배경이 카드 안쪽까지. 줄 사이 divider는 부모(<ul>/<div>)가 last 빼고.
export const ROW_GRID =
  'grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-1 min-h-14 -mx-3 px-3 py-2.5 rounded-md';
export const ROW_DIVIDER = 'border-b border-divider last:border-b-0';

function RowText({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc?: ReactNode }) {
  return (
    <>
      <Icon aria-hidden strokeWidth={1.7} className="mt-[3px] h-4.5 w-4.5 text-ink-muted" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink-strong">{title}</span>
        {desc ? <span className="text-[13px] text-ink-muted">{desc}</span> : null}
      </span>
    </>
  );
}

/** 다른 화면으로 가는 줄 — 줄 전체가 링크 + › */
export function SettingsLinkRow({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <Link
      href={href}
      className={`${ROW_GRID} group items-center outline-none hover:bg-row-hover focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]`}
    >
      <RowText icon={icon} title={title} desc={desc} />
      <ChevronRight aria-hidden className="h-4.5 w-4.5 text-icon-faint group-hover:text-ink-soft" />
    </Link>
  );
}

/** 줄 끝에 버튼 · 입력칸 · 세그먼트가 오는 줄. below = 줄 아래(이름 칸부터 끝까지) 한 줄 */
export function SettingsRow({
  icon,
  title,
  desc,
  end,
  below,
  stackOnMobile,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  desc?: ReactNode;
  end: ReactNode;
  below?: ReactNode;
  /** 입력칸처럼 넓은 줄 끝 — 좁은 화면에선 이름 아래 줄로 내림 */
  stackOnMobile?: boolean;
  className?: string;
}) {
  return (
    <div className={`${ROW_GRID} items-start ${className}`}>
      <RowText icon={icon} title={title} desc={desc} />
      <span
        className={`flex items-center ${
          stackOnMobile ? 'col-span-2 col-start-2 md:col-span-1 md:col-start-auto md:self-center' : 'self-center'
        }`}
      >
        {end}
      </span>
      {below ? <span className="col-span-2 col-start-2">{below}</span> : null}
    </div>
  );
}
