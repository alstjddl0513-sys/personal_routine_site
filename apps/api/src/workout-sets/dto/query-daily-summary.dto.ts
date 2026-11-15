import { IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 운동 통계 '운동한 날' 요약 범위 (heatmap DTO와 같은 날짜 검증).
export class QueryDailySummaryDto {
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to!: string;
}
