import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { resolve } from 'path';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { CompaniesModule } from './companies/companies.module';
import { CompanyTypesModule } from './company-types/company-types.module';
import { TimeBlocksModule } from './time-blocks/time-blocks.module';
import { RoutineChecksModule } from './routine-checks/routine-checks.module';
import { DayNotesModule } from './day-notes/day-notes.module';
import { ExercisesModule } from './exercises/exercises.module';
import { MuscleGoalsModule } from './muscle-goals/muscle-goals.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';
import { WorkoutSetsModule } from './workout-sets/workout-sets.module';
import { ExportModule } from './export/export.module';
import { BlogSourcesModule } from './blog-sources/blog-sources.module';
import { BlogPostsModule } from './blog-posts/blog-posts.module';
import { ProfilesModule } from './profiles/profiles.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '../../.env')],
    }),
    ScheduleModule.forRoot(),
    // Default: 60 req/min per IP for all endpoints (generous). Individual
    // endpoints (e.g. profiles/check-nickname) can tighten via @Throttle().
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    CompaniesModule,
    CompanyTypesModule,
    TimeBlocksModule,
    RoutineChecksModule,
    DayNotesModule,
    ExercisesModule,
    MuscleGoalsModule,
    WorkoutSessionsModule,
    WorkoutSetsModule,
    ExportModule,
    BlogSourcesModule,
    BlogPostsModule,
    ProfilesModule,
    QuestionsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
