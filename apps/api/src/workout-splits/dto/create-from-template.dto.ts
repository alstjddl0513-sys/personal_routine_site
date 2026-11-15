import { IsEnum } from 'class-validator';
import {
  WORKOUT_SPLIT_TEMPLATES,
  type WorkoutSplitTemplate,
} from '@repo/shared';

export class CreateFromTemplateDto {
  // @IsEnum은 배열이 아니라 객체로 (troubleshooting.md).
  @IsEnum(WORKOUT_SPLIT_TEMPLATES)
  kind!: WorkoutSplitTemplate;
}
