import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreateQuestionCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, { message: 'key는 소문자/숫자/언더스코어만 허용' })
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
