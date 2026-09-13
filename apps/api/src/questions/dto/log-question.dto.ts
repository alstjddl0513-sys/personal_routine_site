import { IsIn } from 'class-validator';

// class-validator's @IsEnum with a readonly array clears the allowed values,
// so use IsIn with a spread of the const tuple instead.
export const QUESTION_STATUSES = ['understood', 'review_needed'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export class LogQuestionDto {
  @IsIn([...QUESTION_STATUSES])
  status!: QuestionStatus;
}
