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
import { CompanyTypesService } from './company-types.service';
import { CreateCompanyTypeDto } from './dto/create-company-type.dto';
import { UpdateCompanyTypeDto } from './dto/update-company-type.dto';

@Controller('company-types')
export class CompanyTypesController {
  constructor(private readonly service: CompanyTypesService) {}

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
  create(@Req() req: AuthedRequest, @Body() dto: CreateCompanyTypeDto) {
    return this.service.create(requireUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyTypeDto,
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
