import Link from 'next/link';
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Dumbbell,
  FileText,
  MessagesSquare,
  Palette,
  Rss,
  Tag,
  Target,
} from 'lucide-react';
import { AccountDeleteRow } from '../../components/settings/AccountDeleteRow';
import { BackupButton } from '../../components/settings/BackupButton';
import { LogoutRow } from '../../components/settings/LogoutRow';
import { NicknameRow } from '../../components/settings/NicknameRow';
import { NotifSettingsRow } from '../../components/settings/NotifSettingsRow';
import { PasswordChangeRow } from '../../components/settings/PasswordChangeRow';
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
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              회사에 붙일 유형을 내 취향대로 정리해요.
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
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              하루 루틴의 시간블록을 원하는 순서로 배치해요.
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
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              자주 하는 운동을 등록하고, 안 하는 종목은 잠시 숨겨두세요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/blog-sources"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <Rss className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              블로그 소스 관리
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              구독할 기술 블로그를 골라두면 새 글이 자동으로 모여요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/question-categories"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <BookOpen className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              학습 카테고리 관리
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              학습 질문을 주제별로 묶어두면 관심 영역만 골라 볼 수 있어요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/questions"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <MessagesSquare className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              학습 질문 관리
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              면접 준비 중 만난 질문을 직접 추가·편집해두면 오늘의 학습 풀에 섞여요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/muscle-goals"
          className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <Target className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              부위별 주간 목표
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              한 주에 부위별로 몇 세트를 채울지 목표를 정해두세요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
        <Link
          href="/settings/documents"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          <FileText className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              이력서·포폴 관리
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              여러 버전을 저장하고 대표 문서를 지정해두세요.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
        </Link>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>표시</SectionHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <Palette className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              테마
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              라이트·다크 모드를 취향대로 골라보세요.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>알림</SectionHeader>
        <NotifSettingsRow />
      </section>

      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>계정</SectionHeader>
        <NicknameRow />
        <PasswordChangeRow />
        <LogoutRow />
        <AccountDeleteRow />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            데이터 내보내기
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            지금까지 쌓아둔 모든 기록을 JSON 파일 하나로 내려받아 보관해두세요.
            혹시 모를 상황에 대비해 가끔씩 백업해두면 안심이에요.
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {children}
    </div>
  );
}
