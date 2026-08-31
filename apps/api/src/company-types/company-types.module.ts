import { Module } from '@nestjs/common';
import { CompanyTypesController } from './company-types.controller';
import { CompanyTypesService } from './company-types.service';

@Module({
  controllers: [CompanyTypesController],
  providers: [CompanyTypesService],
})
export class CompanyTypesModule {}
