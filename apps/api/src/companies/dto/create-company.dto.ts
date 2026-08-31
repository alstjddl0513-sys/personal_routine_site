import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ApplicationStatus,
  CompanyType1,
  EmploymentType,
  Priority,
} from './enums';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEnum(CompanyType1)
  type1!: CompanyType1;

  // type2는 user-editable company_types 테이블의 key. 여기선 문자열
  // 형식만 검증 (실존 여부는 프론트 선택 UX가 보장).
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  type2!: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsBoolean()
  isHiring?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  postingUrl?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  applicationStatus?: ApplicationStatus;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  applicationDocUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressNote?: string;
}
