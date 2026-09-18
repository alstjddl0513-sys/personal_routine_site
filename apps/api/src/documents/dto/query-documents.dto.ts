import { IsIn, IsOptional } from 'class-validator';
import { DocumentKind } from './enums';

export class QueryDocumentsDto {
  @IsOptional()
  @IsIn(Object.values(DocumentKind))
  kind?: DocumentKind;
}
