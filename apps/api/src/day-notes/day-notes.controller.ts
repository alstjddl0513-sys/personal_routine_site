import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { DayNotesService } from './day-notes.service';
import { QueryRangeDto } from './dto/query-range.dto';
import { UpsertDayNoteDto } from './dto/upsert-day-note.dto';

@Controller('day-notes')
export class DayNotesController {
  constructor(private readonly service: DayNotesService) {}

  @Get()
  findRange(@Query() query: QueryRangeDto) {
    return this.service.findRange(query);
  }

  @Put(':date')
  upsert(@Param('date') date: string, @Body() dto: UpsertDayNoteDto) {
    return this.service.upsert(date, dto);
  }
}
