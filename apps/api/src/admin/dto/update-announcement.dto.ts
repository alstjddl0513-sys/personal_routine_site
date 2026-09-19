import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnouncementDto } from './create-announcement.dto';

// 부분 update. targetUserIds가 명시적으로 오면 완전 교체(빈 배열 = 전체),
// undefined면 기존 targets 유지. 서비스 레이어에서 분기.
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
