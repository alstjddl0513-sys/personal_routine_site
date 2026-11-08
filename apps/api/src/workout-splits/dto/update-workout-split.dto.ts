import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WORKOUT_SPLIT_NAME_MAX } from '@repo/shared';

export class UpdateWorkoutSplitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKOUT_SPLIT_NAME_MAX)
  name?: string;

  // 주면 종목 목록을 통째로 바꿈.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  exerciseIds?: string[];
}
