import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const HTTP_URL_REGEX = /^https?:\/\/.+/i;

// 어떤 필드든 optional. isActive=true PATCH면 서비스가 같은 kind의 다른
// row를 false로 자동 변경 (트랜잭션). url은 link kind만 의미 있음(파일
// kind에 url 넣으면 무시).
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Matches(HTTP_URL_REGEX, {
    message: 'url must start with http:// or https://',
  })
  @MaxLength(1000)
  url?: string;
}
