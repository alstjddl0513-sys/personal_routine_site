import { IsIn, IsOptional } from 'class-validator';
import {
  ROUTINE_CHALLENGE_STATUSES,
  type RoutineChallengeStatus,
} from '@repo/shared';

export class QueryChallengesDto {
  @IsOptional()
  @IsIn(ROUTINE_CHALLENGE_STATUSES as readonly string[])
  status?: RoutineChallengeStatus;
}
