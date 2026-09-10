import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { DayNotesService } from './day-notes.service';
import { QueryRangeDto } from './dto/query-range.dto';
import { UpsertDayNoteDto } from './dto/upsert-day-note.dto';

@Controller('day-notes')
export class DayNotesController {
  constructor(private readonly service: DayNotesService) {}

  @Get()
  findRange(@Req() req: AuthedRequest, @Query() query: QueryRangeDto) {
    return this.service.findRange(requireUserId(req), query);
  }

  @Put(':date')
  upsert(
    @Req() req: AuthedRequest,
    @Param('date') date: string,
    @Body() dto: UpsertDayNoteDto,
  ) {
    return this.service.upsert(requireUserId(req), date, dto);
  }
}
