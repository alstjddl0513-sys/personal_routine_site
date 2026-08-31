import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CompanyType1 } from './enums';

const toBool = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class QueryCompaniesDto {
  @IsOptional()
  @IsEnum(CompanyType1)
  type1?: CompanyType1;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isHiring?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
