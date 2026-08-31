import { IsBoolean, IsString, IsUUID, Matches } from 'class-validator';

export class ToggleCheckDto {
  @IsUUID()
  blockId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsBoolean()
  checked!: boolean;
}
