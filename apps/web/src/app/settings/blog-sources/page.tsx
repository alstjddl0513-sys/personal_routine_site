import { getBlogSources } from '../../../lib/api';
import { BlogSourcesManager } from '../../../components/settings/BlogSourcesManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '구독한 블로그 · Rally',
};

export default async function BlogSourcesSettingsPage() {
  const sources = await getBlogSources(true);
  return (
    <SettingsSubPage title="구독한 블로그" desc="기술 블로그를 추가해두면 새 글이 자동으로 모여요.">
      <BlogSourcesManager initial={sources} />
    </SettingsSubPage>
  );
}
