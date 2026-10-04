import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ROUTINE_CHALLENGE_STATUSES,
  type RoutineChallengeStatus,
} from '@repo/shared';

// 사용자 조작은 title 수정, 포기(status='abandoned')만 허용.
// 'active'→'completed' 전환은 서버가 progress 계산으로 자동 처리.
export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsIn(ROUTINE_CHALLENGE_STATUSES as readonly string[])
  status?: RoutineChallengeStatus;
}
