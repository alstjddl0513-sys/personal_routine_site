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
      emptyText="아직 만든 카테고리가 없어요."
      deleteTitle={(label) => `'${label}' 카테고리를 삭제할까요?`}
      deleteBody="이미 이 카테고리를 쓰던 질문은 그대로 남고, 필터 목록에서만 사라져요."
    />
  );
}
