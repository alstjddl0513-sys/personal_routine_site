import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

// key와 isDefault는 편집 불가. key는 companies.type2가 참조하는 값이라
// 바꾸면 기존 회사와 disconnect되고, isDefault는 시드 시점의 표식일 뿐
// 편집 대상이 아님. label과 sortOrder만 변경 허용.
export class UpdateCompanyTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
