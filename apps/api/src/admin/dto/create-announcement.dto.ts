import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ANNOUNCEMENT_KINDS, type AnnouncementKind } from '@repo/shared';

// 공지 생성. targetUserIds 미지정/빈 배열 = 전체 유저 대상.
// startsAt/endsAt은 ISO8601 문자열, null 허용.
export class CreateAnnouncementDto {
  @IsIn(ANNOUNCEMENT_KINDS)
  kind!: AnnouncementKind;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  targetUserIds?: string[];
}
