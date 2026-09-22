import { Suspense } from 'react';
import { listAdminFeedback } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { FeedbackList } from '../../../components/admin/FeedbackList';

export const metadata = {
  title: '피드백 · 관리자 · Rally',
};

export const dynamic = 'force-dynamic';

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <FeedbackContent />
    </Suspense>
  );
}

async function FeedbackContent() {
  const rows = await listAdminFeedback();
  return <FeedbackList initial={rows} />;
}
