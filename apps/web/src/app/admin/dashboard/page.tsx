import { Suspense, type ReactNode } from 'react';
import { getAdminStatsOverview } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { StatCard } from '../../../components/admin/StatCard';
import { formatDotDateTime } from '../../../components/admin/admin-ui';

export const metadata = {
  title: '개요 · 관리자 · Rally',
};

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

// 카드 6개를 '가입' · '로그인' 두 묶음으로 — "얼마나 늘었나"와 "얼마나 쓰고 있나"는 읽는 축이 달라서.
async function DashboardContent() {
  const stats = await getAdminStatsOverview();
  return (
    <div className="flex flex-col gap-5">
      <Group title="가입">
        <StatCard label="전체 사용자" value={stats.totalUsers} />
        <StatCard label="신규 가입 · 7일" value={stats.signups7d} />
        <StatCard label="신규 가입 · 30일" value={stats.signups30d} />
      </Group>
      {/* 마지막 로그인 시각 기준 — 로그인을 유지한 채 쓰는 사람은 안 잡혀서
          '활성 사용자(DAU)'가 아니라 측정 그대로 이름 붙임 */}
      <Group title="로그인">
        <StatCard label="24시간 안에 로그인" value={stats.dau} />
        <StatCard label="7일 안에 로그인" value={stats.wau} />
        <StatCard label="30일 안에 로그인" value={stats.mau} />
      </Group>
      <p className="-mt-1 text-[12.5px] text-ink-faint">
        {formatDotDateTime(stats.generatedAt)} 기준
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[13px] font-bold text-ink-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1].map((g) => (
        <div key={g} className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-12" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
