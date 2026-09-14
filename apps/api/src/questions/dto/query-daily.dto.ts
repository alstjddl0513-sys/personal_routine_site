import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class QueryDailyDto {
  // Client sends the user's "today" (KST). Server uses this as the shuffle
  // seed so the same date always returns the same 5 questions.
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  // CSV of category keys to filter by. Absent/empty = 전체.
  // Transform CSV → string[] before validation.
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((s) => s.trim()).filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categories?: string[];
}
