import { Module } from '@nestjs/common';
import { RoutineChallengesController } from './routine-challenges.controller';
import { RoutineChallengesService } from './routine-challenges.service';

@Module({
  controllers: [RoutineChallengesController],
  providers: [RoutineChallengesService],
})
export class RoutineChallengesModule {}
