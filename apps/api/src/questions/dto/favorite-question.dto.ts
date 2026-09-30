import { IsBoolean } from 'class-validator';

export class FavoriteQuestionDto {
  @IsBoolean()
  isFavorite!: boolean;
}
