import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

// 내 분할 id 전부를 새 순서대로.
export class ReorderWorkoutSplitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  ids!: string[];
}
