import { IsString, MaxLength } from 'class-validator';

export class UpsertDayNoteDto {
  @IsString()
  @MaxLength(2000)
  content!: string;
}
