import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { LogQuestionDto } from './dto/log-question.dto';
import { QueryRandomDto } from './dto/query-random.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get('random')
  findRandom(@Req() req: AuthedRequest, @Query() query: QueryRandomDto) {
    return this.service.findRandom(requireUserId(req), query);
  }

  @Get(':id')
  findOne(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(requireUserId(req), id);
  }

  @Put(':id/log')
  upsertLog(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogQuestionDto,
  ) {
    return this.service.upsertLog(requireUserId(req), id, dto);
  }
}
