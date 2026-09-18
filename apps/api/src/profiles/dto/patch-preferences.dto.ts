import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';

// 서버 sync 대상은 알림 계열만. shape는 packages/shared의 Preferences와
// 반드시 일치. 새 필드 추가 시 여기 + shared 양쪽 동시에 갱신.
// 전역 ValidationPipe(whitelist + forbidNonWhitelisted)로 unknown 키는 400.

class NotifWorkoutSkipDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn([3, 5, 7, 14])
  skipDays?: number;
}

class NotifPrefsDto {
  @IsOptional()
  @IsBoolean()
  master?: boolean;

  @IsOptional()
  @IsBoolean()
  morningSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  deadline?: boolean;

  @IsOptional()
  @IsBoolean()
  routineEvening?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotifWorkoutSkipDto)
  workoutSkip?: NotifWorkoutSkipDto;
}

export class PatchPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotifPrefsDto)
  notif?: NotifPrefsDto;
}
