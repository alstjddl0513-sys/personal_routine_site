import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../admin.guard';
import { AdminService } from './admin.service';
import { BanUserDto } from './dto/ban-user.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

// 어드민 전용 라우트. 전역 SupabaseAuthGuard가 인증 통과시킨 후 AdminGuard가
// env `ADMIN_USER_IDS` 매치를 최종 확인. ping은 프론트 사이드바 링크 조건부
// 렌더에 사용(auth ok + admin ok = 200).
//
// 전역 60/min throttle은 스킵 — AdminGuard로 이미 접근 통제, 어드민이 짧은
// 시간에 사용자 목록 · 공지 관리 · UserPicker 등 여러 endpoint를 오가는 UX
// 특성상 쉽게 429 걸림. 남용 위험은 AdminGuard가 대체.

@SkipThrottle()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Get('users')
  listUsers(@Query() query: QueryUsersDto) {
    return this.service.listUsers(query);
  }

  @Post('users/:id/ban')
  banUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.service.banUser(id, dto.durationHours);
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.unbanUser(id);
  }

  @Delete('users/:id')
  @HttpCode(204)
  async deleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.service.deleteUser(id);
  }

  @Get('announcements')
  listAnnouncements() {
    return this.service.listAnnouncements();
  }

  @Post('announcements')
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.service.createAnnouncement(dto);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.service.updateAnnouncement(id, dto);
  }

  @Delete('announcements/:id')
  @HttpCode(204)
  async removeAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.service.removeAnnouncement(id);
  }
}
