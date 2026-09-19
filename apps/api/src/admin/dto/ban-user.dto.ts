import { IsIn } from 'class-validator';
import { BAN_DURATION_HOURS, type BanDurationHours } from '@repo/shared';

// Supabase Auth의 auth.admin.updateUserById({ ban_duration: '<n>h' })에 전달할
// 시간. 1일 / 7일 / 30일 / 100년(=사실상 영구)만 허용. 임의 값 방지.
export class BanUserDto {
  @IsIn(BAN_DURATION_HOURS)
  durationHours!: BanDurationHours;
}
