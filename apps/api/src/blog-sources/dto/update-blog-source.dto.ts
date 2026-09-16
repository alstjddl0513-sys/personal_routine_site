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

const HTTP_URL_REGEX = /^https?:\/\/.+/i;

export class UpdateBlogSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'rssUrl must start with http:// or https://' })
  @MaxLength(500)
  rssUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(HTTP_URL_REGEX, { message: 'siteUrl must start with http:// or https://' })
  @MaxLength(500)
  siteUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
