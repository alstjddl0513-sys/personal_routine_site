import { IsOptional, IsString, Matches } from 'class-validator';

export class QueryWorkoutSplitsDto {
  // 이 날짜 이전 마지막 기록으로 다음 차례를 계산. 없으면 오늘(서울) 기준.
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'before must be YYYY-MM-DD' })
  before?: string;
}
