import {
  IsIn,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// 2단계 업로드의 1단계 payload. 파일 kind(resume/portfolio)만. 링크는 별도
// createLink 엔드포인트 사용.
//
// 크기 상한은 서비스 레이어에서 kind별 분리 검증 (resume 10MB, portfolio
// 50MB). mime는 'application/pdf'만 (첫 릴리스 스코프).
export class InitDocumentDto {
  @IsIn(['resume', 'portfolio'])
  kind!: 'resume' | 'portfolio';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  fileName!: string;

  @IsInt()
  @IsPositive()
  fileSize!: number;

  @IsIn(['application/pdf'])
  fileMime!: 'application/pdf';
}
