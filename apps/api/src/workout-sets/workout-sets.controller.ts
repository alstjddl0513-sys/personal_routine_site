import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { WorkoutSetsService } from './workout-sets.service';
import { BatchWorkoutSetsDto } from './dto/batch-workout-sets.dto';
import { QueryHeatmapDto } from './dto/query-heatmap.dto';
import { QueryDailySummaryDto } from './dto/query-daily-summary.dto';
import { QueryExerciseStatsBatchDto } from './dto/query-exercise-stats-batch.dto';
import { QueryMuscleSetsDto } from './dto/query-muscle-sets.dto';
import { QueryWeeklyVolumeDto } from './dto/query-weekly-volume.dto';
import { QueryWorkoutSetsDto } from './dto/query-workout-sets.dto';
import { QuerySessionContextDto } from './dto/query-session-context.dto';

@Controller('workout-sets')
export class WorkoutSetsController {
  constructor(private readonly service: WorkoutSetsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryWorkoutSetsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  // /workouts — 종목별 '지난 기록' + 최고 기록을 한 왕복으로(service.getSessionContext)
  @Get('session-context')
  getSessionContext(
    @Req() req: AuthedRequest,
    @Query() query: QuerySessionContextDto,
  ) {
    return this.service.getSessionContext(requireUserId(req), query);
  }

  @Get('heatmap')
  findHeatmap(@Req() req: AuthedRequest, @Query() query: QueryHeatmapDto) {
    return this.service.findHeatmap(requireUserId(req), query);
  }

  @Get('daily-summary')
  findDailySummary(
    @Req() req: AuthedRequest,
    @Query() query: QueryDailySummaryDto,
  ) {
    return this.service.findDailySummary(requireUserId(req), query);
  }

  @Get('exercise-stats-batch')
  findExerciseStatsBatch(
    @Req() req: AuthedRequest,
    @Query() query: QueryExerciseStatsBatchDto,
  ) {
    return this.service.findExerciseStatsBatch(requireUserId(req), query);
  }

  @Get('weekly-volume')
  findWeeklyVolume(
    @Req() req: AuthedRequest,
    @Query() query: QueryWeeklyVolumeDto,
  ) {
    return this.service.findWeeklyVolume(requireUserId(req), query);
  }

  @Get('muscle-sets')
  findMuscleSets(
    @Req() req: AuthedRequest,
    @Query() query: QueryMuscleSetsDto,
  ) {
    return this.service.findMuscleSets(requireUserId(req), query);
  }

  @Put('batch')
  batchReplace(@Req() req: AuthedRequest, @Body() dto: BatchWorkoutSetsDto) {
    return this.service.batchReplace(requireUserId(req), dto);
  }
}
