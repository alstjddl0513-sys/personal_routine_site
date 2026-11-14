import { Suspense } from 'react';
import { getAdminStatsOverview } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { StatCard } from '../../../components/admin/StatCard';

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

async function DashboardContent() {
  const stats = await getAdminStatsOverview();
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="전체 사용자" value={stats.totalUsers} />
        <StatCard label="신규 가입 (7일)" value={stats.signups7d} />
        <StatCard label="신규 가입 (30일)" value={stats.signups30d} />
        {/* 마지막 로그인 시각 기준 — 로그인을 유지한 채 쓰는 사람은 안 잡혀서
            '활성 사용자(DAU)'가 아니라 측정 그대로 이름 붙임 */}
        <StatCard label="24시간 안에 로그인" value={stats.dau} />
        <StatCard label="7일 안에 로그인" value={stats.wau} />
        <StatCard label="30일 안에 로그인" value={stats.mau} />
      </section>

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        {formatDateTime(stats.generatedAt)} 기준
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}
