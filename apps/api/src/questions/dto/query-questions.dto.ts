import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

// 관리 페이지 list 필터. Absent/empty = 전체.
export class QueryQuestionsDto {
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
