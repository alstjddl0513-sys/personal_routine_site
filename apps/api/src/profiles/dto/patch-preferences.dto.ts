import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { WORKOUT_WEEKLY_DAYS_MAX, WORKOUT_WEEKLY_DAYS_MIN } from '@repo/shared';

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

class LearnFilterPrefsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  dailyCategories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  reviewCategories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  favoritesCategories?: string[];
}

class WorkoutPrefsDto {
  @IsOptional()
  @IsInt()
  @Min(WORKOUT_WEEKLY_DAYS_MIN)
  @Max(WORKOUT_WEEKLY_DAYS_MAX)
  weeklyDaysTarget?: number;
}

export class PatchPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotifPrefsDto)
  notif?: NotifPrefsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LearnFilterPrefsDto)
  learn?: LearnFilterPrefsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkoutPrefsDto)
  workout?: WorkoutPrefsDto;
}
