import { IsString, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class QueryHeatmapDto {
  @IsString()
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to!: string;
}
