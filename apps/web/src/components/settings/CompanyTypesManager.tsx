'use client';

import { type CompanyType } from '@repo/shared';
import { createCompanyType, deleteCompanyType, patchCompanyType } from '../../lib/api';
import { LabelListManager } from './LabelListManager';

export function CompanyTypesManager({ initial }: { initial: CompanyType[] }) {
  return (
    <LabelListManager
      initial={initial}
      keyPrefix="type"
      create={createCompanyType}
      patch={patchCompanyType}
      remove={deleteCompanyType}
      addLabel="유형 추가"
      placeholder="이름 (예: 내 유형)"
      deleteTitle="회사 유형 삭제"
      deleteDescription={(label) => (
        <p>
          {label} 유형을 삭제할까요? 이미 이 유형을 쓰던 회사에는 그대로 남고, 목록에서만 사라져요.
        </p>
      )}
    />
  );
}
