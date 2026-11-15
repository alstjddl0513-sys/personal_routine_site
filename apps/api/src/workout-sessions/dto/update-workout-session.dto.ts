import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

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

  // 그날 한 분할. null이면 분할 없음. 본인 분할인지 service에서 확인.
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  splitId?: string | null;
}
