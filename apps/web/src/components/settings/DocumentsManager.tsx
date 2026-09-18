'use client';

import type { Document } from '@repo/shared';
import { DOCUMENT_MAX_BYTES } from '@repo/shared';
import { DocumentSection } from './DocumentSection';

// 이력서·포폴·링크 3섹션을 세로 나열. 초기 데이터는 server component가 전달.
// 각 섹션은 자체적으로 조작 → router.refresh로 서버 동기.
export function DocumentsManager({ initial }: { initial: Document[] }) {
  const resumes = initial.filter((d) => d.kind === 'resume');
  const portfolios = initial.filter((d) => d.kind === 'portfolio');
  const links = initial.filter((d) => d.kind === 'link');

  return (
    <div className="flex flex-col gap-6">
      <DocumentSection
        kind="resume"
        title="이력서"
        description="여러 버전을 저장하고 현재 사용할 대표 문서 하나를 지정하세요. PDF, 최대 10MB."
        maxBytes={DOCUMENT_MAX_BYTES.resume}
        rows={resumes}
      />
      <DocumentSection
        kind="portfolio"
        title="포트폴리오"
        description="이미지 위주 포폴은 PDF로 묶어 올리세요. 최대 50MB."
        maxBytes={DOCUMENT_MAX_BYTES.portfolio}
        rows={portfolios}
      />
      <DocumentSection
        kind="link"
        title="외부 링크"
        description="노션·GitHub·개인 사이트 등 외부 URL을 저장해두면 지원 시 빠르게 참조."
        rows={links}
      />
    </div>
  );
}
