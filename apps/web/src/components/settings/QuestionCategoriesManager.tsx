'use client';

import { type QuestionCategory } from '@repo/shared';
import {
  createQuestionCategory,
  deleteQuestionCategory,
  patchQuestionCategory,
} from '../../lib/api';
import { LabelListManager } from './LabelListManager';

export function QuestionCategoriesManager({ initial }: { initial: QuestionCategory[] }) {
  return (
    <LabelListManager
      initial={initial}
      keyPrefix="cat"
      create={createQuestionCategory}
      patch={patchQuestionCategory}
      remove={deleteQuestionCategory}
      addLabel="카테고리 추가"
      placeholder="이름 (예: 알고리즘)"
      deleteTitle="카테고리 삭제"
      deleteDescription={(label) => (
        <p>
          {label} 카테고리를 삭제할까요? 이미 이 카테고리를 쓰던 질문은 그대로 남고, 필터 목록에서만 사라져요.
        </p>
      )}
    />
  );
}
