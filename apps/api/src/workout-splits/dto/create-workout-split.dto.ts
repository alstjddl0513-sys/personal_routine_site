import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WORKOUT_SPLIT_NAME_MAX } from '@repo/shared';

export class CreateWorkoutSplitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(WORKOUT_SPLIT_NAME_MAX)
  name!: string;

  // 비어 있어도 됨 — 이름만 먼저 만들고 종목은 나중에 고를 수 있게.
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  exerciseIds!: string[];
}
