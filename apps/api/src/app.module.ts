import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { resolve } from 'path';
import { AccessTokenGuard } from './access-token.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { CompaniesModule } from './companies/companies.module';
import { CompanyTypesModule } from './company-types/company-types.module';
import { TimeBlocksModule } from './time-blocks/time-blocks.module';
import { RoutineChecksModule } from './routine-checks/routine-checks.module';
import { DayNotesModule } from './day-notes/day-notes.module';
import { ExercisesModule } from './exercises/exercises.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';
import { WorkoutSetsModule } from './workout-sets/workout-sets.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '../../.env')],
    }),
    CompaniesModule,
    CompanyTypesModule,
    TimeBlocksModule,
    RoutineChecksModule,
    DayNotesModule,
    ExercisesModule,
    WorkoutSessionsModule,
    WorkoutSetsModule,
    ExportModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AppModule {}
