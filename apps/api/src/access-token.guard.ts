import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Header-based auth for the 1-person deployment. Inactive when
// API_ACCESS_TOKEN is unset so local dev needs no extra config.
// /health stays public for Render's uptime pinger.
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('API_ACCESS_TOKEN');
    if (!expected) return true;

    const req = context.switchToHttp().getRequest<Request>();
    if (req.path === '/health') return true;

    const provided = req.header('x-auth-token');
    if (provided !== expected) {
      throw new UnauthorizedException('invalid access token');
    }
    return true;
  }
}
