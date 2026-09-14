import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

// key와 isDefault는 편집 불가. key는 questions.category_key가 참조하는 값이라
// 바꾸면 기존 질문과 disconnect되고, isDefault는 시드 시점의 표식일 뿐.
export class UpdateQuestionCategoryDto {
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
