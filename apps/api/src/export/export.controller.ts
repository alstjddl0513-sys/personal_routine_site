import { Controller, Get, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get()
  dumpAll(@Req() req: AuthedRequest) {
    return this.service.dumpAll(requireUserId(req));
  }
}
