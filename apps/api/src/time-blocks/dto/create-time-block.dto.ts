import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTimeBlockDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  // Minutes from midnight (0..1410), 30-min step enforced client-side.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1410)
  startTime?: number;
}
