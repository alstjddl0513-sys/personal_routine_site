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
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { WorkoutSplitsService } from './workout-splits.service';
import { CreateWorkoutSplitDto } from './dto/create-workout-split.dto';
import { UpdateWorkoutSplitDto } from './dto/update-workout-split.dto';
import { QueryWorkoutSplitsDto } from './dto/query-workout-splits.dto';
import { ReorderWorkoutSplitsDto } from './dto/reorder-workout-splits.dto';
import { CreateFromTemplateDto } from './dto/create-from-template.dto';

@Controller('workout-splits')
export class WorkoutSplitsController {
  constructor(private readonly service: WorkoutSplitsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryWorkoutSplitsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateWorkoutSplitDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Post('templates')
  createFromTemplate(
    @Req() req: AuthedRequest,
    @Body() dto: CreateFromTemplateDto,
  ) {
    return this.service.createFromTemplate(requireUserId(req), dto.kind);
  }

  // 처음부터 다시 짜기 — 내 분할 전부 삭제(운동 기록은 남음)
  @Delete()
  removeAll(@Req() req: AuthedRequest) {
    return this.service.removeAll(requireUserId(req));
  }

  @Put('order')
  reorder(@Req() req: AuthedRequest, @Body() dto: ReorderWorkoutSplitsDto) {
    return this.service.reorder(requireUserId(req), dto.ids);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutSplitDto,
  ) {
    return this.service.update(requireUserId(req), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.remove(requireUserId(req), id);
  }
}
