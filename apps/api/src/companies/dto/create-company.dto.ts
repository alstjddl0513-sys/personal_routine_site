import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// class-validator @IsUrl은 validator.js isURL을 그대로 쓰는데, 한글이
// 들어간 채용 공고 URL(잡코리아·사람인·라이너 등 쿼리스트링에 한글
// 파라미터 포함)이 IDN을 거부해서 400이 됨. 프론트에서 이미 new URL()
// 로 파싱 + http(s):// 프리픽스를 강제하므로 서버는 프리픽스 + 길이만
// 얕게 검증한다.
const HTTP_URL_REGEX = /^https?:\/\/.+/i;
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
  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'postingUrl must start with http:// or https://' })
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
  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'applicationDocUrl must start with http:// or https://' })
  @MaxLength(1000)
  applicationDocUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressNote?: string;
}
