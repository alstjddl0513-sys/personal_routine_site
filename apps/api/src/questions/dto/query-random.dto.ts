import { IsOptional, IsUUID } from 'class-validator';

export class QueryRandomDto {
  // Excludes a specific question (e.g. the one currently shown) so the "next"
  // button doesn't roll the same id twice in a row.
  @IsOptional()
  @IsUUID()
  exclude?: string;
}
