import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseAdminUserIds } from './admin/is-admin.util';
import { requireUserId, type AuthedRequest } from './supabase-auth.guard';

// SupabaseAuthGuard(전역) 뒤에 스택되는 어드민 게이트. `@UseGuards(AdminGuard)`만
// 붙이면 됨 — 전역 가드가 이미 req.user를 세팅한다.
// env `ADMIN_USER_IDS` 미설정 시 어드민 부재 상태로 간주하여 전부 403.
// 서버는 그대로 부팅됨(옵셔널 env).

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = requireUserId(req);
    const admins = parseAdminUserIds(this.config);
    if (!admins.has(userId)) {
      throw new ForbiddenException('admin only');
    }
    return true;
  }
}
