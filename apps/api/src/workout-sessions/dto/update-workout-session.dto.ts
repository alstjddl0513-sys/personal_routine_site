import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkoutSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @IsOptional()
  @IsDateString()
  endedAt?: string | null;
}
