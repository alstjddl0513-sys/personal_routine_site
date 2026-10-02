import { IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 월 뷰는 보통 42일(6×7) 그리드 범위를 보내므로 명시적 from/to 받음.
export class QueryRangeDto {
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to!: string;
}
