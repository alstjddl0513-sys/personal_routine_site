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
import { CreateQuestionDto } from './dto/create-question.dto';
import { LogQuestionDto } from './dto/log-question.dto';
import { QueryDailyDto } from './dto/query-daily.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { QueryRandomDto } from './dto/query-random.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { QueryStatsRangeDto } from './dto/query-stats-range.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  // 관리 페이지용 full list (owner-scoped, createdAt DESC). daily/review와
  // 헷갈리지 않도록 base path에 배치. daily/review/random/stats/:id 모두
  // 아래에서 별도 처리.
  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryQuestionsDto) {
    return this.service.findAllForOwner(requireUserId(req), query);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateQuestionDto) {
    return this.service.create(requireUserId(req), dto);
  }

  // Today's 5-question set (deterministic per owner+date). Client passes
  // its KST "today" as the seed.
  @Get('daily')
  findDaily(@Req() req: AuthedRequest, @Query() query: QueryDailyDto) {
    return this.service.findDaily(requireUserId(req), query);
  }

  @Get('random')
  findRandom(@Req() req: AuthedRequest, @Query() query: QueryRandomDto) {
    return this.service.findRandom(requireUserId(req), query);
  }

  // '복습필요'로 마킹한 질문 모음. Static path so it lands above :id.
  @Get('review')
  findReview(@Req() req: AuthedRequest, @Query() query: QueryReviewDto) {
    return this.service.findReview(requireUserId(req), query);
  }

  // Static /stats/* routes above :id so Nest doesn't try to parse 'stats'
  // as a uuid via ParseUUIDPipe.
  @Get('stats/heatmap')
  getHeatmap(@Req() req: AuthedRequest, @Query() query: QueryStatsRangeDto) {
    return this.service.getHeatmap(requireUserId(req), query);
  }

  @Get('stats/summary')
  getSummary(@Req() req: AuthedRequest) {
    return this.service.getSummary(requireUserId(req));
  }

  @Get(':id')
  findOne(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(requireUserId(req), id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
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

  @Put(':id/log')
  upsertLog(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogQuestionDto,
  ) {
    return this.service.upsertLog(requireUserId(req), id, dto);
  }
}
