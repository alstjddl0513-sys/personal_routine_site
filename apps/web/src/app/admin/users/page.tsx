import { listAdminUsers } from '../../../lib/api';
import { UsersTable } from '../../../components/admin/UsersTable';

export const metadata = {
  title: '사용자 관리 · Rally',
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const initial = await listAdminUsers({ perPage: 50 });
  return <UsersTable initial={initial} />;
}
