import { getCompanyTypes } from '../../../lib/api';
import { CompanyTypesManager } from '../../../components/settings/CompanyTypesManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '회사 유형 · Rally',
};

export default async function CompanyTypesSettingsPage() {
  const types = await getCompanyTypes();
  return (
    <SettingsSubPage title="회사 유형" desc="회사에 붙일 유형을 정리해두세요.">
      <CompanyTypesManager initial={types} />
    </SettingsSubPage>
  );
}
