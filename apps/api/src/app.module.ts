import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { CompaniesModule } from './companies/companies.module';
import { TimeBlocksModule } from './time-blocks/time-blocks.module';
import { RoutineChecksModule } from './routine-checks/routine-checks.module';
import { DayNotesModule } from './day-notes/day-notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '../../.env')],
    }),
    CompaniesModule,
    TimeBlocksModule,
    RoutineChecksModule,
    DayNotesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
