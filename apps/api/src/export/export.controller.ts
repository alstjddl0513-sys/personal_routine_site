import { Controller, Get } from '@nestjs/common';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get()
  dumpAll() {
    return this.service.dumpAll();
  }
}
