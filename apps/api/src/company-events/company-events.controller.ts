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
import { CompanyEventsService } from './company-events.service';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { UpdateCompanyEventDto } from './dto/update-company-event.dto';
import { QueryCompanyEventsDto } from './dto/query-events.dto';

@Controller('company-events')
export class CompanyEventsController {
  constructor(private readonly service: CompanyEventsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryCompanyEventsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateCompanyEventDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyEventDto,
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
