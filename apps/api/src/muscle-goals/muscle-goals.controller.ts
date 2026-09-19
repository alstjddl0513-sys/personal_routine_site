import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { MuscleGoalsService } from './muscle-goals.service';
import { UpsertMuscleGoalDto } from './dto/upsert-muscle-goal.dto';

@Controller('muscle-goals')
export class MuscleGoalsController {
  constructor(private readonly service: MuscleGoalsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.service.findAll(requireUserId(req));
  }

  // URL param이 muscleKey인 이유는 (owner, key) unique이라 자연 식별자로
  // 쓰는 게 upsert에 편함. company-types와 달리 id 노출/편집 UI가 없음.
  @Put(':muscleKey')
  upsert(
    @Req() req: AuthedRequest,
    @Param('muscleKey') muscleKey: string,
    @Body() dto: UpsertMuscleGoalDto,
  ) {
    return this.service.upsert(requireUserId(req), muscleKey, dto);
  }

  @Delete(':muscleKey')
  @HttpCode(204)
  async remove(
    @Req() req: AuthedRequest,
    @Param('muscleKey') muscleKey: string,
  ) {
    await this.service.remove(requireUserId(req), muscleKey);
  }
}
