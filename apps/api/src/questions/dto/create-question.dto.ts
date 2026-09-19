import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  answer!: string;

  // 꼬리 질문 (자유 서식, 줄바꿈 구분 권장). 없으면 null 저장.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tip?: string | null;

  // question_categories.key. 미지정 = null. FK 없음(스키마 참고).
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'categoryKey는 소문자/숫자/언더스코어만 허용',
  })
  categoryKey?: string | null;
}
