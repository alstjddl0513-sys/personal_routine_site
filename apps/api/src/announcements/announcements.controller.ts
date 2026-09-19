import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { AnnouncementsService } from './announcements.service';

// 일반 유저 대상. 어드민만 CRUD하고, 여기서는 조회·읽음 처리만.

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  findForUser(@Req() req: AuthedRequest) {
    const userId = requireUserId(req);
    return this.service.findForUser(userId);
  }

  @Post(':id/read')
  @HttpCode(204)
  async markRead(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const userId = requireUserId(req);
    await this.service.markRead(userId, id);
  }
}
