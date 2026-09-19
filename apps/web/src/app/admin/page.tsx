import { redirect } from 'next/navigation';

// /admin 진입 시 사용자 관리 페이지로. 대시보드는 스코프 밖.
export default function AdminIndexPage(): never {
  redirect('/admin/users');
}
