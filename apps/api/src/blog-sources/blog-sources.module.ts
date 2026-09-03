import { Module } from '@nestjs/common';
import { BlogSourcesController } from './blog-sources.controller';
import { BlogSourcesService } from './blog-sources.service';

@Module({
  controllers: [BlogSourcesController],
  providers: [BlogSourcesService],
  exports: [BlogSourcesService],
})
export class BlogSourcesModule {}
