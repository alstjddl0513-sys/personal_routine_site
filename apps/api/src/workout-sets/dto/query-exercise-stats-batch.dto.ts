import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

// 운동 통계 종목 카드용 — 종목마다 GET /workout-sets/exercise-stats를 부르던 것을
// 한 번으로. 모양은 session-context DTO와 같음(CSV, 최대 100).
export class QueryExerciseStatsBatchDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  exerciseIds!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number;
}
