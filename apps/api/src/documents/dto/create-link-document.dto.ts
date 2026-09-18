import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// URL은 한글 IDN 대응 위해 얕은 검증만(create-company.dto와 동일 규칙).
// kind='link'는 컨트롤러 라우트가 강제하므로 DTO에 별도 필드 X.
const HTTP_URL_REGEX = /^https?:\/\/.+/i;

export class CreateLinkDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @Matches(HTTP_URL_REGEX, {
    message: 'url must start with http:// or https://',
  })
  @MaxLength(1000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
