import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { HealthResponse } from '@repo/shared';
import { db } from '../db/client';

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
}
