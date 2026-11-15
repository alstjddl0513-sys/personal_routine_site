import Link from 'next/link';
import { Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RallyLogo } from '../RallyLogo';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 로그인 계열 5화면 공통 (docs/design/rally-auth*.html) — 로그인 · 가입 · 비밀번호 찾기 · 새 비밀번호 · 로그인 필요.
// 로그인 전 화면이라 사이드바를 덮는 화면(fixed inset-0). 세로로 짧은 창에서도 안 잘리게 스크롤.

export const AUTH_CARD =
  'flex w-full max-w-100 flex-col gap-4 rounded-lg border border-line bg-surface px-7 pt-6.5 pb-7';

export const AUTH_LABEL = 'text-[13.5px] font-semibold text-ink-soft';

// 설정 화면 입력칸(40px/15px)보다 한 치수 큰 44px/15.5px
export const AUTH_INPUT =
  'block h-11 w-full rounded-md border border-btn-border bg-surface px-3.5 text-[15.5px] text-ink outline-none placeholder:text-ink-faint focus:border-chip-on-border focus:shadow-[0_0_0_1px_var(--rally-chip-on-border)] disabled:opacity-60';

/** 입력칸 오류(AUTH_INPUT 뒤에 붙임) */
export const AUTH_INPUT_ERROR =
  'border-alert! focus:shadow-[0_0_0_1px_var(--rally-alert)]! focus:border-alert!';

// 화면마다 하나뿐인 채운 버튼 — 비활성 = divider 바탕 + icon-faint 글자, 진행 중은 부르는 쪽이 회전 아이콘 + opacity
export const AUTH_PRIMARY =
  'inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-button text-[15px] font-bold text-white outline-none hover:opacity-90 focus-visible:shadow-[0_0_0_2px_var(--rally-paper),0_0_0_4px_var(--rally-chip-on-border)] disabled:cursor-not-allowed disabled:bg-divider disabled:text-icon-faint disabled:hover:opacity-100 data-[busy=true]:opacity-75 data-[busy=true]:disabled:bg-button data-[busy=true]:disabled:text-white';

export function AuthShell({
  title,
  footer,
  children,
}: {
  /** 로고 아래 화면 이름(로그인 필요 화면은 없음) */
  title?: string;
  /** 카드 밖 한 줄 */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-paper font-plex text-ink">
      <div className="flex min-h-full items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-100 flex-col items-center gap-4.5">
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="inline-flex items-center gap-2 text-[23px] font-bold text-ink-strong">
              <RallyLogo size={26} stemClassName="stroke-ink-strong" />
              Rally
            </h1>
            {title ? <p className="text-sm text-ink-muted">{title}</p> : null}
          </div>
          {children}
          {footer ? <p className="text-[13.5px] text-ink-muted">{footer}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** 카드 밖 한 줄의 링크(600 btn-fg) */
export function AuthFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-btn-fg underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/** 서버 오류 한 줄 — 카드 맨 위 */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-alert bg-surface px-3 py-2.5 text-[13.5px] leading-normal text-alert"
    >
      <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
      <span>{message}</span>
    </div>
  );
}

/** 채운 버튼 안 글자 — 진행 중이면 회전 아이콘 + "…중" */
export function BusyLabel({ busy, idle, busyText }: { busy: boolean; idle: ReactNode; busyText: string }) {
  return busy ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {busyText}
    </>
  ) : (
    <>{idle}</>
  );
}

/**
 * 안내 카드 — 메일 보냈어요 · 링크 만료 · 변경 완료 · 로그인 필요.
 * 40px 선 아이콘(icon-faint) → 제목 18px → 문장 14px → 버튼(채움 또는 테두리, 없으면 생략).
 * 경고색 없음 — 사용자 잘못이 아니고 할 일이 분명해서.
 */
export function AuthNotice({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: { href: string; label: string; tone: 'primary' | 'secondary' };
}) {
  return (
    <div className="flex w-full max-w-100 flex-col items-center gap-3.5 rounded-lg border border-line bg-surface px-7 pt-7.5 pb-7 text-center">
      <Icon className="h-10 w-10 text-icon-faint" strokeWidth={1.5} aria-hidden />
      <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
      {children ? <div className="flex flex-col gap-1.5 text-sm leading-[1.65] text-ink-soft">{children}</div> : null}
      {action ? (
        <Link
          href={action.href}
          className={
            action.tone === 'primary' ? `${AUTH_PRIMARY} mt-1` : `${BUTTON_SECONDARY} mt-1 h-11 w-full text-[15px]`
          }
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
