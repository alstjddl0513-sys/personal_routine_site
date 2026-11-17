import {
  CircleQuestionMark,
  Dumbbell,
  FileText,
  Folder,
  Palette,
  Repeat,
  Rss,
  Tag,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AccountDeleteRow } from '../../components/settings/AccountDeleteRow';
import { BackupButton } from '../../components/settings/BackupButton';
import { FeedbackRow } from '../../components/settings/FeedbackRow';
import { LogoutRow } from '../../components/settings/LogoutRow';
import { NicknameRow } from '../../components/settings/NicknameRow';
import { NotifSettingsRow } from '../../components/settings/NotifSettingsRow';
import { PasswordChangeRow } from '../../components/settings/PasswordChangeRow';
import { ROW_DIVIDER, SettingsLinkRow, SettingsRow } from '../../components/settings/SettingsRow';
import { ThemeSegment } from '../../components/settings/ThemeSegment';
import { APP_VERSION } from '../../lib/version';

// 관리 카드의 소묶음 — 사이드바 순서(채용 · 운동 · 학습 · 블로그). 루틴은 /routines에서 바로 고쳐서 따로 없음.
const MANAGEMENT_GROUPS: {
  title: string;
  items: { href: string; icon: LucideIcon; title: string; desc: string }[];
}[] = [
  {
    title: '채용',
    items: [
      { href: '/settings/company-types', icon: Tag, title: '회사 유형', desc: '회사에 붙일 유형을 내 취향대로 정리해요.' },
      {
        href: '/settings/documents',
        icon: FileText,
        title: '이력서·포트폴리오',
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
        title: '운동 종목',
        desc: '자주 하는 운동을 등록하고, 안 하는 종목은 잠시 숨겨두세요.',
      },
      { href: '/settings/splits', icon: Repeat, title: '분할', desc: '순서대로 돌아가며 할 운동 묶음을 만들어두세요.' },
      {
        href: '/settings/muscle-goals',
        icon: Target,
        title: '주간 운동 목표',
        desc: '한 주에 며칠, 부위별로 몇 세트를 할지 정해두세요.',
      },
    ],
  },
  {
    title: '학습',
    items: [
      {
        href: '/settings/question-categories',
        icon: Folder,
        title: '학습 카테고리',
        desc: '학습 질문을 주제별로 묶어두면 관심 영역만 골라 볼 수 있어요.',
      },
      {
        href: '/settings/questions',
        icon: CircleQuestionMark,
        title: '학습 질문',
        desc: '면접 준비 중 만난 질문을 추가해두면 오늘의 학습에 같이 나와요.',
      },
    ],
  },
  {
    title: '블로그',
    items: [
      { href: '/settings/blog-sources', icon: Rss, title: '구독한 블로그', desc: '기술 블로그를 추가해두면 새 글이 자동으로 모여요.' },
    ],
  },
];

// 가운데 한 열(본문 최대 720px — 좌우 여백 포함 800). 옆에 다른 내용이 없어서 왼쪽 정렬이면 넓은 화면에서 오른쪽이 크게 빔 — 읽고 고르는 화면이라 넓히지 않음.
// 모바일 관리자 입구는 더보기 시트의 '관리자 페이지' 줄(닉네임은 아래 계정 › 닉네임).
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink">
      <div className="mx-auto flex max-w-200 flex-col gap-7 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">설정</h1>

        <Section title="관리">
          {MANAGEMENT_GROUPS.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? 'border-t border-rule' : ''}>
              <h3 className="pt-3 pb-0.5 text-[13px] font-bold text-ink-muted">{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href} className={ROW_DIVIDER}>
                    <SettingsLinkRow {...item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section title="앱">
          <ul>
            <li className={ROW_DIVIDER}>
              <SettingsRow icon={Palette} title="테마" desc="라이트·다크 모드를 취향대로 골라보세요." end={<ThemeSegment />} />
            </li>
            <li className={ROW_DIVIDER}>
              <NotifSettingsRow />
            </li>
            <li className={ROW_DIVIDER}>
              <FeedbackRow />
            </li>
          </ul>
        </Section>

        <Section title="계정">
          <ul>
            <li className={ROW_DIVIDER}>
              <NicknameRow />
            </li>
            <li className={ROW_DIVIDER}>
              <PasswordChangeRow />
            </li>
            <li className={ROW_DIVIDER}>
              <BackupButton />
            </li>
          </ul>
        </Section>

        {/* 로그아웃(왼쪽) · 계정 삭제(오른쪽 끝) — 서로 멀리 둬서 잘못 누르지 않게, 숨기지는 않음 */}
        <div className="-mt-3 flex items-center justify-between gap-4 border-t border-rule pt-4">
          <LogoutRow />
          <AccountDeleteRow />
        </div>

        {/* 앱 정보 — 로그아웃 줄과 떨어진 맨 아래 가운데(버튼 설명처럼 안 보이게) */}
        <p className="pt-2 text-center text-xs text-ink-faint">Rally v{APP_VERSION}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[17px] font-bold text-heading">{title}</h2>
      <div className="rounded-lg border border-line bg-surface px-5 py-1">{children}</div>
    </section>
  );
}
