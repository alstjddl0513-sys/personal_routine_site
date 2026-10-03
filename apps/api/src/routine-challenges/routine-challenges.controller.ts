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
import { RoutineChallengesService } from './routine-challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { QueryChallengesDto } from './dto/query-challenges.dto';

@Controller('routine-challenges')
export class RoutineChallengesController {
  constructor(private readonly service: RoutineChallengesService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryChallengesDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateChallengeDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChallengeDto,
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
