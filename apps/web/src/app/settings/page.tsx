import Link from 'next/link';
import {
  CalendarClock,
  ChevronRight,
  Dumbbell,
  Palette,
  Rss,
  Tag,
} from 'lucide-react';
import { BackupButton } from '../../components/settings/BackupButton';
import { LogoutRow } from '../../components/settings/LogoutRow';
import { ThemeToggle } from '../../components/ThemeToggle';
import { APP_VERSION } from '../../lib/version';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">설정</h1>
      </header>

      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/settings/company-types"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <Tag className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              기업 유형 관리
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              채용 리스트의 &quot;유형&quot; 필터/선택에 나오는 항목을 추가·편집·삭제.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/time-blocks"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <CalendarClock className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              시간블록 관리
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              루틴 트래커의 시간블록을 추가·편집·재정렬·삭제.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/exercises"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <Dumbbell className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              운동 종목 관리
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              운동 기록 페이지의 종목을 추가·편집·숨김·삭제.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/blog-sources"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          <Rss className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              블로그 소스 관리
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              기술 블로그 페이지의 RSS 소스를 추가·편집·일시중지·삭제.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Palette className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              테마
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              라이트/다크 모드 전환.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <LogoutRow />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            데이터 내보내기
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            모든 도메인(회사·시간블록·체크·회고·운동·세션·세트) 스냅샷을
            단일 JSON 파일로 다운로드합니다. 배포 후 정기적으로 로컬에 저장해
            두는 걸 권장.
          </p>
        </div>
        <BackupButton />
      </section>

      <section className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          버전
        </span>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          Rally v{APP_VERSION}
        </span>
      </section>
    </div>
  );
}
