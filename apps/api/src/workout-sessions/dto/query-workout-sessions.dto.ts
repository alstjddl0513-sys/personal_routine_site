import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Either `date` (single day) OR (`from` AND `to`) (range).
// If none given, service returns [].
export class QueryWorkoutSessionsDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
