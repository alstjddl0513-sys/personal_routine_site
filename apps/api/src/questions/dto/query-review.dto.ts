import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class QueryReviewDto {
  // CSV of category keys to filter by. Absent/empty = 전체.
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
