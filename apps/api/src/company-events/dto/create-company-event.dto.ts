import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { COMPANY_EVENT_TYPES, type CompanyEventType } from '@repo/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCompanyEventDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @Matches(DATE_RE, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsIn(COMPANY_EVENT_TYPES as readonly string[])
  type!: CompanyEventType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
