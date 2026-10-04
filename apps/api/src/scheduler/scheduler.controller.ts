import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { SchedulerService } from './scheduler.service';
import { QueryRangeDto } from './dto/query-range.dto';
import { UpsertMemoDto } from './dto/upsert-memo.dto';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  // 월 뷰 (job 이벤트 + 메모 통합). 6×7 그리드 전체 범위 전달.
  @Get()
  findRange(@Req() req: AuthedRequest, @Query() query: QueryRangeDto) {
    return this.service.findRange(requireUserId(req), query);
  }

  // 날짜당 메모 1개. PUT /scheduler/memos/:date로 upsert, 빈 content면 삭제.
  @Put('memos/:date')
  upsertMemo(
    @Req() req: AuthedRequest,
    @Param('date') date: string,
    @Body() dto: UpsertMemoDto,
  ) {
    return this.service.upsertMemo(requireUserId(req), date, dto);
  }
}
