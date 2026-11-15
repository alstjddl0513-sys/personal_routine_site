import { Module } from '@nestjs/common';
import { WorkoutSplitsController } from './workout-splits.controller';
import { WorkoutSplitsService } from './workout-splits.service';

@Module({
  controllers: [WorkoutSplitsController],
  providers: [WorkoutSplitsService],
  exports: [WorkoutSplitsService],
})
export class WorkoutSplitsModule {}
