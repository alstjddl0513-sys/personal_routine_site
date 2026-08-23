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
    TimeBlocksModule,
    RoutineChecksModule,
    DayNotesModule,
    ExercisesModule,
    WorkoutSessionsModule,
    WorkoutSetsModule,
    ExportModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
