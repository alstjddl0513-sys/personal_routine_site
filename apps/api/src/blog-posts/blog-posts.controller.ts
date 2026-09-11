import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { requireUserId, type AuthedRequest } from '../supabase-auth.guard';
import { BlogPostsService } from './blog-posts.service';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';

@Controller('blog-posts')
export class BlogPostsController {
  constructor(private readonly service: BlogPostsService) {}

  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: QueryBlogPostsDto) {
    return this.service.findAll(requireUserId(req), query);
  }

  // 활성 소스 순회 → RSS fetch → 신규 글만 insert.
  // HTTP 호출은 요청 유저의 소스만; @Cron은 전 유저 훑음 (service.refresh 참고).
  @Post('refresh')
  refresh(@Req() req: AuthedRequest) {
    return this.service.refresh(requireUserId(req));
  }
}
