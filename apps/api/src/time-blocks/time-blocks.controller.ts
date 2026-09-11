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
  Query,
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { TimeBlocksService } from './time-blocks.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import { QueryTimeBlocksDto } from './dto/query-time-blocks.dto';

@Controller('time-blocks')
export class TimeBlocksController {
  constructor(private readonly service: TimeBlocksService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryTimeBlocksDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateTimeBlockDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeBlockDto,
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
}
