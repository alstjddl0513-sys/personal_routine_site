import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// 사용자 목록 조회 쿼리. 검색·정렬은 앱 레벨(초기 유저 수 작음).
// listUsers pagination은 Supabase SDK에 위임 — perPage는 SDK 200 상한 존중.
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
