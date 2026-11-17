import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

// /workouts 진입 시 종목별 '지난 기록' + 최고 기록을 한 왕복으로 받는 배치 endpoint의 query.
//
// exerciseIds는 CSV로 전달 (URL 길이는 종목 30개 기준 ~1.2KB, 안전 범위).
// max 100은 페이지가 실질적으로 다룰 상한.
export class QuerySessionContextDto {
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

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'beforeDate must be YYYY-MM-DD' })
  beforeDate!: string;
}
