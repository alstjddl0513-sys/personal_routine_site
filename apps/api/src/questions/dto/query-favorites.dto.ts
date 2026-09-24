import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

// 즐겨찾기 목록 필터. CSV of category keys. Absent/empty = 전체.
export class QueryFavoritesDto {
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
