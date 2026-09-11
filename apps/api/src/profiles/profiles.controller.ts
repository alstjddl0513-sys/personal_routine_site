import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../public.decorator';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me')
  findMe(@Req() req: AuthedRequest) {
    const userId = requireUserId(req);
    return this.service.findMe(userId);
  }

  @Put('me')
  upsertMe(@Req() req: AuthedRequest, @Body() dto: UpsertProfileDto) {
    const userId = requireUserId(req);
    return this.service.upsertMe(userId, dto.nickname);
  }

  @Patch('me/nickname')
  renameMe(@Req() req: AuthedRequest, @Body() dto: UpsertProfileDto) {
    const userId = requireUserId(req);
    return this.service.renameMe(userId, dto.nickname);
  }

  // Public — checked before signup, when there's no session yet. Callers
  // that are already logged in should skip the check when the value equals
  // their current nickname (no server-side "exclude self" needed).
  //
  // Rate-limited harder than the global default because it's unauthenticated
  // and enumerable — 10 req / 10s per IP is enough for typing feedback and
  // way below what a scraper needs to be worthwhile.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 10_000 } })
  @Get('check-nickname')
  async check(@Query('nickname') nickname?: string) {
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      throw new BadRequestException('nickname must be 2~20 chars');
    }
    if (!/^[\p{L}\p{N}_]+$/u.test(nickname)) {
      throw new BadRequestException('nickname has invalid characters');
    }
    const available = await this.service.isAvailable(nickname);
    return { available };
  }
}

