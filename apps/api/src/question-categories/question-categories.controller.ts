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
  Req,
} from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto';
import { UpdateQuestionCategoryDto } from './dto/update-question-category.dto';
import { QuestionCategoriesService } from './question-categories.service';

@Controller('question-categories')
export class QuestionCategoriesController {
  constructor(private readonly service: QuestionCategoriesService) {}

  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.service.findAll(requireUserId(req));
  }

  @Get(':id')
  findOne(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(requireUserId(req), id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateQuestionCategoryDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionCategoryDto,
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
