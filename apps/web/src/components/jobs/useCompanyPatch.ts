'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { patchCompany } from '../../lib/api';

// 회사 한 칸 저장 → 서버 값으로 다시 그림. 사이드 패널(CompanyDetailPanel)과 모바일 카드 시트가 같이 씀.
// 저장 후 서버 값으로 다시 그려지면(key 변경) 입력칸도 새 값으로 초기화.
export function useCompanyPatch(id: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function patch(input: Parameters<typeof patchCompany>[1], optimistic?: () => void) {
    startTransition(async () => {
      optimistic?.();
      try {
        await patchCompany(id, input);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }
  return { isPending, patch };
}
