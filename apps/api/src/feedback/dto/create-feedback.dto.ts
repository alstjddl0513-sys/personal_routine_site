import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@repo/shared';

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_CATEGORIES as unknown as string[])
  category!: FeedbackCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;
}
