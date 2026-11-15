import { Lock } from 'lucide-react';
import { AuthNotice, AuthShell } from '../../components/auth/AuthShell';

export const metadata = {
  title: '로그인이 필요해요 · Rally',
};

// Safety-net page for unexpected 401s (e.g. upstream API rejects the request).
// The normal auth flow redirects unauthenticated visitors to /login, so users
// should rarely land here.
// 로그인이 풀린 상태라 [홈으로]는 결국 로그인 화면으로 가서 버튼은 [로그인하기] 하나만. (docs/design/rally-auth*.html)
export default function UnauthorizedPage() {
  return (
    <AuthShell>
      <AuthNotice
        icon={Lock}
        title="로그인이 필요해요"
        action={{ href: '/login', label: '로그인하기', tone: 'primary' }}
      >
        <p>로그인이 풀렸어요. 다시 로그인하면 이어서 쓸 수 있어요.</p>
      </AuthNotice>
    </AuthShell>
  );
}
