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
          하루 루틴의 시간블록을 원하는 순서로 배치해요.
          블록을 지우면 그 블록의 체크 이력도 같이 사라지니 신중히 눌러주세요.
        </p>
      </header>

      <TimeBlocksManager initial={blocks} />
    </div>
  );
}
