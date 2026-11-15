import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// 사용자 목록 조회 쿼리. 전체 사용자를 모은 뒤 검색 · 정렬 · 페이지 자르기는 앱 레벨(유저 수 작음).
export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  perPage?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'lastSignInAt'])
  sortBy?: 'createdAt' | 'lastSignInAt';
}
