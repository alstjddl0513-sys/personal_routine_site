import { getExercises } from '../../../lib/api';
import { ExercisesManager } from '../../../components/settings/ExercisesManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '운동 종목 · Rally',
};

export default async function ExercisesSettingsPage() {
  const exercises = await getExercises(true);
  return (
    <SettingsSubPage title="운동 종목" desc="자주 하는 종목을 등록하고, 요즘 안 하는 종목은 숨겨두세요.">
      <ExercisesManager initial={exercises} />
    </SettingsSubPage>
  );
}
