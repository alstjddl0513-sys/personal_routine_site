import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { HealthResponse } from '@repo/shared';
import { db } from '../db/client';
import { Public } from '../public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthResponse> {
    let dbStatus: HealthResponse['db'] = 'error';
    try {
      await db.execute(sql`select 1`);
      dbStatus = 'ok';
    } catch (err) {
      console.error('[health] db ping failed:', err);
    }
    return { status: 'ok', db: dbStatus };
  }

  // Uptime-warmer용. `/health`는 DB 왕복이 있어 콜드 스타트 자체는
  // 깨우지만 poll 부하가 붙고, DB가 잠깐 죽어도 "unhealthy"로 응답해
  // 외부 크론이 알림을 날리는 문제가 있음. `/health/ping`은 순수 200만
  // 반환해서 Render 무료 티어의 유휴 슬립(15분)을 저비용으로 방지.
  @Public()
  @Get('ping')
  ping(): { ok: true } {
    return { ok: true };
  }
}
