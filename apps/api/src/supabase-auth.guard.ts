import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// Supabase-issued JWT verifier (asymmetric, ES256 via JWKS).
// This Supabase project already migrated to JWKS-based signing keys, so we
// fetch the public keyset from the project's well-known endpoint and let jose
// cache/rotate it. Attaches { id, email } to req.user on success. When
// SUPABASE_URL is unset the guard is a no-op, mirroring AccessTokenGuard so
// local dev needs no extra config. /health stays public for Render's uptime
// pinger.
//
// Not yet registered in AppModule — wired in Phase 12.2 alongside the
// frontend Supabase Auth cutover.

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

type JWKS = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private jwks?: JWKS;
  private jwksUrl?: string;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (!supabaseUrl) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (req.path === '/health') return true;

    const header = req.header('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      throw new UnauthorizedException('missing bearer token');
    }

    const token = match[1];
    const jwks = this.getJwks(supabaseUrl);

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, jwks, {
        issuer: `${supabaseUrl.replace(/\/$/, '')}/auth/v1`,
        audience: 'authenticated',
      });
      payload = verified.payload;
    } catch {
      throw new UnauthorizedException('invalid token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('token missing subject');
    }

    const email = typeof payload.email === 'string' ? payload.email : null;
    req.user = { id: payload.sub, email };
    return true;
  }

  // Lazy-build the JWKS client so it's created only when auth is active, and
  // rebuild if SUPABASE_URL changes (e.g. tests swap config).
  private getJwks(supabaseUrl: string): JWKS {
    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
    if (this.jwks && this.jwksUrl === url) return this.jwks;
    this.jwks = createRemoteJWKSet(new URL(url));
    this.jwksUrl = url;
    return this.jwks;
  }
}
