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
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { WorkoutSessionsService } from './workout-sessions.service';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';
import { QueryWorkoutSessionsDto } from './dto/query-workout-sessions.dto';

@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly service: WorkoutSessionsService) {}

  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query() query: QueryWorkoutSessionsDto,
  ) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(requireUserId(req), id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateWorkoutSessionDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutSessionDto,
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
