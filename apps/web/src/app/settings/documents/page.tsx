import { listDocuments } from '../../../lib/api';
import { DocumentsManager } from '../../../components/settings/DocumentsManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '이력서·포트폴리오 · Rally',
};

export default async function DocumentsSettingsPage() {
  const docs = await listDocuments();
  return (
    <SettingsSubPage title="이력서·포트폴리오" desc="지원할 때 낼 이력서 · 포트폴리오를 버전별로 모아두세요.">
      <DocumentsManager initial={docs} />
    </SettingsSubPage>
  );
}
