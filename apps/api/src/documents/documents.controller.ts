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
import { DocumentsService } from './documents.service';
import { InitDocumentDto } from './dto/init-document.dto';
import { CreateLinkDocumentDto } from './dto/create-link-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryDocumentsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  @Post('init')
  init(@Req() req: AuthedRequest, @Body() dto: InitDocumentDto) {
    return this.service.init(requireUserId(req), dto);
  }

  @Post('link')
  createLink(@Req() req: AuthedRequest, @Body() dto: CreateLinkDocumentDto) {
    return this.service.createLink(requireUserId(req), dto);
  }

  @Get(':id/download')
  downloadUrl(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.createDownloadUrl(requireUserId(req), id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(requireUserId(req), id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.service.remove(requireUserId(req), id);
  }
}
