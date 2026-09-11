import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { WorkoutSetsService } from './workout-sets.service';
import { BatchWorkoutSetsDto } from './dto/batch-workout-sets.dto';
import { QueryHeatmapDto } from './dto/query-heatmap.dto';
import { QueryWorkoutSetsDto } from './dto/query-workout-sets.dto';
import { QueryPreviousDto } from './dto/query-previous.dto';
import { QueryExerciseStatsDto } from './dto/query-exercise-stats.dto';

@Controller('workout-sets')
export class WorkoutSetsController {
  constructor(private readonly service: WorkoutSetsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryWorkoutSetsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Get('previous')
  findPrevious(@Req() req: AuthedRequest, @Query() query: QueryPreviousDto) {
    return this.service.findPrevious(requireUserId(req), query);
  }

  @Get('exercise-stats')
  findExerciseStats(
    @Req() req: AuthedRequest,
    @Query() query: QueryExerciseStatsDto,
  ) {
    return this.service.findExerciseStats(requireUserId(req), query);
  }

  @Get('heatmap')
  findHeatmap(@Req() req: AuthedRequest, @Query() query: QueryHeatmapDto) {
    return this.service.findHeatmap(requireUserId(req), query);
  }

  @Put('batch')
  batchReplace(@Req() req: AuthedRequest, @Body() dto: BatchWorkoutSetsDto) {
    return this.service.batchReplace(requireUserId(req), dto);
  }
}
