import { Controller, Get, Post, Query } from '@nestjs/common';
import { BlogPostsService } from './blog-posts.service';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';

@Controller('blog-posts')
export class BlogPostsController {
  constructor(private readonly service: BlogPostsService) {}

  @Get()
  findAll(@Query() query: QueryBlogPostsDto) {
    return this.service.findAll(query);
  }

  // 활성 소스 순회 → RSS fetch → 신규 글만 insert. 스케줄러(cronjob.org) 대상.
  @Post('refresh')
  refresh() {
    return this.service.refresh();
  }
}
