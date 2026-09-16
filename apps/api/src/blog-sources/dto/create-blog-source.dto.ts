import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// @IsUrl은 IDN 거부로 400 나는 사례가 있어(companies DTO 참고) 프리픽스
// 검증만 얕게 수행. RSS/사이트 URL은 관리자가 입력하는 값이라 위험도
// 낮음.
const HTTP_URL_REGEX = /^https?:\/\/.+/i;

export class CreateBlogSourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'rssUrl must start with http:// or https://' })
  @MaxLength(500)
  rssUrl!: string;

  @IsOptional()
  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'siteUrl must start with http:// or https://' })
  @MaxLength(500)
  siteUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
