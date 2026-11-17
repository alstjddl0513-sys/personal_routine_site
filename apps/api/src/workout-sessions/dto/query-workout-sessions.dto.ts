import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 하루(`date`)의 기록들. 없으면 service가 [].
export class QueryWorkoutSessionsDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
