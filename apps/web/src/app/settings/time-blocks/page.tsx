import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTimeBlocks } from '../../../lib/api';
import { TimeBlocksManager } from '../../../components/settings/TimeBlocksManager';

export const metadata = {
  title: '시간블록 관리 · Rally',
};

export default async function TimeBlocksSettingsPage() {
  const blocks = await getTimeBlocks();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          설정으로 돌아가기
        </Link>
        <h1 className="text-xl font-semibold">시간블록 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          루틴 트래커의 시간블록을 추가·편집·재정렬·삭제합니다. 삭제 시
          해당 블록의 체크 이력도 모두 함께 삭제됩니다.
        </p>
      </header>

      <TimeBlocksManager initial={blocks} />
    </div>
  );
}
