import { IsOptional, IsUUID } from 'class-validator';

export class QueryWorkoutSetsDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
