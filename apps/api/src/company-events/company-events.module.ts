import { Module } from '@nestjs/common';
import { CompanyEventsController } from './company-events.controller';
import { CompanyEventsService } from './company-events.service';

@Module({
  controllers: [CompanyEventsController],
  providers: [CompanyEventsService],
})
export class CompanyEventsModule {}
