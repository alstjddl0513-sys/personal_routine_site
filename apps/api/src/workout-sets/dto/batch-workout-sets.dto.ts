import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkoutSetEntryDto {
  @IsInt()
  @Min(1)
  @Max(20)
  setNumber!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999.99)
  weightKg?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  reps?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  rir?: number | null;
}

// PUT /workout-sets/batch — replaces all sets for (sessionId, exerciseId) atomically.
export class BatchWorkoutSetsDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  exerciseId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutSetEntryDto)
  sets!: WorkoutSetEntryDto[];
}
