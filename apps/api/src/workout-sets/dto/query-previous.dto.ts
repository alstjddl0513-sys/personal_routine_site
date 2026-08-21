import { IsString, IsUUID, Matches } from 'class-validator';

export class QueryPreviousDto {
  @IsUUID()
  exerciseId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'beforeDate must be YYYY-MM-DD' })
  beforeDate!: string;
}
