import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// 부분 편집. 시드/커스텀 구분 없이 모든 필드 편집 가능.
export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tip?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'categoryKey는 소문자/숫자/언더스코어만 허용',
  })
  categoryKey?: string | null;
}
