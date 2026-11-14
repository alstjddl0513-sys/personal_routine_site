import Link from 'next/link';
import { LostIcon } from '../components/ErrorIcons';
import { BUTTON_PRIMARY } from '../components/jobs/cells/popover-style';

export const metadata = {
  title: '페이지를 찾을 수 없어요 · Rally',
};

// Renders for unmatched routes and explicit notFound() calls. (docs/design/rally-error*.html)
// 본문 자리에만 뜸(화면 전체를 덮지 않음) — 사이드바로 다른 화면에 바로 갈 수 있게.
// 경고색 없음 — 사용자 잘못이 아니라서. 갈 곳이 하나라 [오늘 화면으로]가 채운 버튼.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-4 py-16 font-plex">
      <div className="flex w-full max-w-105 flex-col items-center gap-3.5 text-center">
        <LostIcon className="h-10 w-10 text-icon-faint" />
        <h1 className="text-[22px] font-bold text-ink-strong">페이지를 찾을 수 없어요</h1>
        <p className="text-[15px] leading-[1.6] text-ink-soft">주소가 잘못됐거나 사라진 페이지예요.</p>
        <div className="mt-1.5 flex justify-center gap-2">
          <Link href="/today" className={BUTTON_PRIMARY}>
            오늘 화면으로
          </Link>
        </div>
      </div>
    </div>
  );
}
