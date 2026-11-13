import { WORKOUT_WEEKLY_DAYS_DEFAULT } from '@repo/shared';
import { getMuscleGoals, getMyProfile } from '../../../lib/api';
import { MuscleGoalsManager } from '../../../components/settings/MuscleGoalsManager';
import { WeeklyDaysGoalField } from '../../../components/settings/WeeklyDaysGoalField';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '주간 운동 목표 · Rally',
};

export default async function MuscleGoalsSettingsPage() {
  const [goals, profile] = await Promise.all([
    getMuscleGoals(),
    getMyProfile().catch(() => null),
  ]);
  const weeklyDays =
    profile?.preferences.workout?.weeklyDaysTarget ?? WORKOUT_WEEKLY_DAYS_DEFAULT;

  return (
    <SettingsSubPage title="주간 운동 목표" desc="한 주에 며칠, 부위별로 몇 세트 할지 정해두세요.">
      <WeeklyDaysGoalField initial={weeklyDays} />
      <MuscleGoalsManager initial={goals} />
    </SettingsSubPage>
  );
}
