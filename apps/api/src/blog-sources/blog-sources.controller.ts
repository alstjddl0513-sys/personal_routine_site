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
import { BlogSourcesService } from './blog-sources.service';
import { CreateBlogSourceDto } from './dto/create-blog-source.dto';
import { UpdateBlogSourceDto } from './dto/update-blog-source.dto';
import { QueryBlogSourcesDto } from './dto/query-blog-sources.dto';

@Controller('blog-sources')
export class BlogSourcesController {
  constructor(private readonly service: BlogSourcesService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryBlogSourcesDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(requireUserId(req), id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateBlogSourceDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogSourceDto,
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
