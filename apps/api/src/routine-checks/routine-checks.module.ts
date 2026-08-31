import { Module } from '@nestjs/common';
import { RoutineChecksController } from './routine-checks.controller';
import { RoutineChecksService } from './routine-checks.service';

@Module({
  controllers: [RoutineChecksController],
  providers: [RoutineChecksService],
})
export class RoutineChecksModule {}
