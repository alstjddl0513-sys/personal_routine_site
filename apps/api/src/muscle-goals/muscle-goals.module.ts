import { Module } from '@nestjs/common';
import { MuscleGoalsController } from './muscle-goals.controller';
import { MuscleGoalsService } from './muscle-goals.service';

@Module({
  controllers: [MuscleGoalsController],
  providers: [MuscleGoalsService],
})
export class MuscleGoalsModule {}
