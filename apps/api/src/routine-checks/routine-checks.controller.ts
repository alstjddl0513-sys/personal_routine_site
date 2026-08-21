import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { RoutineChecksService } from './routine-checks.service';
import { QueryRangeDto } from './dto/query-range.dto';
import { ToggleCheckDto } from './dto/toggle-check.dto';

@Controller('routine-checks')
export class RoutineChecksController {
  constructor(private readonly service: RoutineChecksService) {}

  @Get()
  findRange(@Query() query: QueryRangeDto) {
    return this.service.findRange(query);
  }

  @Put()
  toggle(@Body() dto: ToggleCheckDto) {
    return this.service.toggle(dto);
  }
}
