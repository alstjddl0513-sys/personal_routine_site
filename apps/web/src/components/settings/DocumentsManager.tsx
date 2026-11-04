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
        description="여러 버전을 올려두고 지금 쓸 대표 문서 하나를 정해두세요. PDF, 최대 10MB."
        maxBytes={DOCUMENT_MAX_BYTES.resume}
        rows={resumes}
      />
      <DocumentSection
        kind="portfolio"
        title="포트폴리오"
        description="이미지가 많은 포트폴리오는 PDF로 묶어 올려주세요. 최대 50MB."
        maxBytes={DOCUMENT_MAX_BYTES.portfolio}
        rows={portfolios}
      />
      <DocumentSection
        kind="link"
        title="외부 링크"
        description="노션·GitHub·개인 사이트 링크를 저장해두면 지원할 때 바로 꺼내 쓸 수 있어요."
        rows={links}
      />
    </div>
  );
}
