import { Body, Controller, Get, Put, Query } from '@nestjs/common';
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
  findAll(@Query() query: QueryWorkoutSetsDto) {
    return this.service.findAll(query);
  }

  @Get('previous')
  findPrevious(@Query() query: QueryPreviousDto) {
    return this.service.findPrevious(query);
  }

  @Get('exercise-stats')
  findExerciseStats(@Query() query: QueryExerciseStatsDto) {
    return this.service.findExerciseStats(query);
  }

  @Get('heatmap')
  findHeatmap(@Query() query: QueryHeatmapDto) {
    return this.service.findHeatmap(query);
  }

  @Put('batch')
  batchReplace(@Body() dto: BatchWorkoutSetsDto) {
    return this.service.batchReplace(dto);
  }
}
