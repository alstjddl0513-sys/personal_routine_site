// 월 뷰 + 날짜 패널은 다음 PR(PR C)에서 구현.
// 이 플레이스홀더는 라우트/사이드바/DB가 먼저 깔리는 PR A 범위.
// 내부 코드/DB엔 'scheduler' 이름이 남아있지만 유저 노출은 '캘린더'로 통일.
export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold">캘린더</h1>
      </header>

      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          월 뷰·메모·채용 일정 연동 구현 중이에요.
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          곧 공개될 예정입니다.
        </p>
      </div>
    </div>
  );
}
