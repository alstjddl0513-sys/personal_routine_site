import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

// POST /feedback — 인증 유저 아무나 제출.
// GET /admin/feedback — AdminGuard로 게이트.
// 전역 SupabaseAuthGuard가 이미 req.user 세팅. throttle은 기본 60/min 그대로.
@Controller()
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post('feedback')
  create(@Req() req: AuthedRequest, @Body() dto: CreateFeedbackDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @UseGuards(AdminGuard)
  @Get('admin/feedback')
  listAllForAdmin() {
    return this.service.listAllForAdmin();
  }

  @UseGuards(AdminGuard)
  @Delete('admin/feedback/:id')
  @HttpCode(204)
  async removeForAdmin(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.removeForAdmin(id);
  }
}
