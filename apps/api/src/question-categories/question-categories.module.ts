import { Module } from '@nestjs/common';
import { QuestionCategoriesController } from './question-categories.controller';
import { QuestionCategoriesService } from './question-categories.service';

@Module({
  controllers: [QuestionCategoriesController],
  providers: [QuestionCategoriesService],
})
export class QuestionCategoriesModule {}
