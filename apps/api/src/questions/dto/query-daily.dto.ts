import { IsString, Matches } from 'class-validator';

export class QueryDailyDto {
  // Client sends the user's "today" (KST). Server uses this as the shuffle
  // seed so the same date always returns the same 10 questions.
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;
}
