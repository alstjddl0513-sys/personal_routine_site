import { listAllAnnouncements } from '../../../lib/api';
import { AnnouncementsManager } from '../../../components/admin/AnnouncementsManager';

export const metadata = {
  title: '공지 관리 · Rally',
};

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage() {
  const initial = await listAllAnnouncements();
  return <AnnouncementsManager initial={initial} />;
}
