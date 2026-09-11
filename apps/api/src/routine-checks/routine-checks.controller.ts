import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { RoutineChecksService } from './routine-checks.service';
import { QueryRangeDto } from './dto/query-range.dto';
import { ToggleCheckDto } from './dto/toggle-check.dto';

@Controller('routine-checks')
export class RoutineChecksController {
  constructor(private readonly service: RoutineChecksService) {}

  @Get()
  findRange(@Req() req: AuthedRequest, @Query() query: QueryRangeDto) {
    return this.service.findRange(requireUserId(req), query);
  }

  @Put()
  toggle(@Req() req: AuthedRequest, @Body() dto: ToggleCheckDto) {
    return this.service.toggle(requireUserId(req), dto);
  }
}
