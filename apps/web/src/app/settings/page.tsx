import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Download,
  Dumbbell,
  FileText,
  MessagesSquare,
  Palette,
  Rss,
  Shield,
  Tag,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react';
import { AccountDeleteRow } from '../../components/settings/AccountDeleteRow';
import { BackupButton } from '../../components/settings/BackupButton';
import { FeedbackRow } from '../../components/settings/FeedbackRow';
import { LogoutRow } from '../../components/settings/LogoutRow';
import { NicknameRow } from '../../components/settings/NicknameRow';
import { NotifSettingsRow } from '../../components/settings/NotifSettingsRow';
import { PasswordChangeRow } from '../../components/settings/PasswordChangeRow';
import { ThemeToggle } from '../../components/ThemeToggle';
import { getMyProfile } from '../../lib/api';
import { APP_VERSION } from '../../lib/version';

// 관리 카드의 sub-group. 사이드바 탭 순서(채용/운동/학습/블로그) 그대로.
// 루틴 블록은 /routines에서 직접 편집·재정렬 가능 → 별도 관리 페이지 불필요.
// 각 sub-group은 SubHeader + N개의 SettingsLink. 마지막 링크는 border-b 생략.
const MANAGEMENT_GROUPS: {
  title: string;
  items: {
    href: string;
    icon: LucideIcon;
    title: string;
    desc: string;
  }[];
}[] = [
  {
    title: '채용',
    items: [
      {
        href: '/settings/company-types',
        icon: Tag,
        title: '기업 유형 관리',
        desc: '회사에 붙일 유형을 내 취향대로 정리해요.',
      },
      {
        href: '/settings/documents',
        icon: FileText,
        title: '이력서·포폴 관리',
        desc: '여러 버전을 저장하고 대표 문서를 지정해두세요.',
      },
    ],
  },
  {
    title: '운동',
    items: [
      {
        href: '/settings/exercises',
        icon: Dumbbell,
        title: '운동 종목 관리',
        desc: '자주 하는 운동을 등록하고, 안 하는 종목은 잠시 숨겨두세요.',
      },
      {
        href: '/settings/muscle-goals',
        icon: Target,
        title: '부위별 주간 목표',
        desc: '한 주에 부위별로 몇 세트를 채울지 목표를 정해두세요.',
      },
    ],
  },
  {
    title: '학습',
    items: [
      {
        href: '/settings/question-categories',
        icon: BookOpen,
        title: '학습 카테고리 관리',
        desc: '학습 질문을 주제별로 묶어두면 관심 영역만 골라 볼 수 있어요.',
      },
      {
        href: '/settings/questions',
        icon: MessagesSquare,
        title: '학습 질문 관리',
        desc: '면접 준비 중 만난 질문을 직접 추가·편집해두면 오늘의 학습 풀에 섞여요.',
      },
    ],
  },
  {
    title: '블로그',
    items: [
      {
        href: '/settings/blog-sources',
        icon: Rss,
        title: '블로그 소스 관리',
        desc: '구독할 기술 블로그를 골라두면 새 글이 자동으로 모여요.',
      },
    ],
  },
];

// 모바일에는 사이드바 UserRow가 없어서 닉네임·관리자 진입점이 노출될 자리가 없음.
// SSR에서 프로필을 읽어 상단 카드로 렌더. md 이상에서는 사이드바가 담당하므로 숨김.
export default async function SettingsPage() {
  const profile = await getMyProfile().catch(() => null);

  // 마지막 관리 항목 여부 판단용 flat 인덱스 (border-b 생략에 사용).
  const totalManagementItems = MANAGEMENT_GROUPS.reduce(
    (sum, g) => sum + g.items.length,
    0,
  );
  let flatIdx = 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">설정</h1>
      </header>

      {profile ? (
        <section className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <User className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {profile.nickname}
            </div>
            {profile.isAdmin ? (
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-sky-600 dark:text-sky-400">
                관리자
              </div>
            ) : null}
          </div>
          {profile.isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              관리자
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* 관리 — 탭별 sub-group으로 그룹핑 */}
      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>관리</SectionHeader>
        {MANAGEMENT_GROUPS.map((group, gi) => (
          <div key={group.title}>
            <SubHeader isFirst={gi === 0}>{group.title}</SubHeader>
            {group.items.map((item) => {
              flatIdx += 1;
              const isLast = flatIdx === totalManagementItems;
              return (
                <SettingsLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  desc={item.desc}
                  isLast={isLast}
                />
              );
            })}
          </div>
        ))}
      </section>

      {/* 앱 — 표시/알림/피드백 통합 */}
      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>앱</SectionHeader>
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
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
        <div className="border-b border-zinc-100 dark:border-zinc-800">
          <NotifSettingsRow />
        </div>
        <FeedbackRow />
      </section>

      {/* 계정 — 데이터 백업도 포함 */}
      <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <SectionHeader>계정</SectionHeader>
        <NicknameRow />
        <PasswordChangeRow />
        <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Download className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              데이터 백업
            </div>
            <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
              지금까지 쌓아둔 모든 기록을 JSON 파일 하나로 내려받아 보관해두세요.
            </p>
            <div className="mt-2">
              <BackupButton />
            </div>
          </div>
        </div>
        <LogoutRow />
        <AccountDeleteRow />
      </section>

      <footer className="pb-2 pt-1 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-600">
        Rally v{APP_VERSION}
      </footer>
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

// 관리 카드 안의 하위 그룹 헤더. 첫 그룹은 SectionHeader 바로 아래라 border-t
// 없이 붙고, 나머지는 border-t로 위 그룹과 구분.
function SubHeader({
  children,
  isFirst,
}: {
  children: React.ReactNode;
  isFirst: boolean;
}) {
  return (
    <div
      className={`bg-zinc-50 px-4 py-1.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400 ${
        isFirst ? '' : 'border-t border-zinc-100 dark:border-zinc-800'
      }`}
    >
      {children}
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  desc,
  isLast,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  isLast: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
        isLast ? '' : 'border-b border-zinc-100 dark:border-zinc-800'
      }`}
    >
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {title}
        </div>
        <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
          {desc}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
    </Link>
  );
}
