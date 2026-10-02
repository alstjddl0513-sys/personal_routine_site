import { IsString, MaxLength } from 'class-validator';

export class UpsertMemoDto {
  // 빈 문자열이면 서비스에서 삭제 처리 (day-notes 패턴 미러).
  @IsString()
  @MaxLength(500)
  content!: string;
}
