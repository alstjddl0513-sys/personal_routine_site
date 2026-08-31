import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetMuscle?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  defaultSets?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  repMin!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  repMax!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
