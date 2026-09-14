import { IsInt, Max, Min } from 'class-validator';

export class UpsertMuscleGoalDto {
  // 1~50 세트/주. 상한은 실전에서 부위별 20~25가 상급자 최대라
  // 오탈자 방지용 넉넉한 sanity check. UI는 number input.
  @IsInt()
  @Min(1)
  @Max(50)
  weeklySetTarget!: number;
}
