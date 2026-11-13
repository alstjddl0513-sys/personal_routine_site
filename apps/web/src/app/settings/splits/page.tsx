import { getExercises, getWorkoutSplits } from '../../../lib/api';
import { SplitsManager } from '../../../components/settings/SplitsManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '분할 · Rally',
};

export default async function SplitsSettingsPage() {
  const [{ splits }, exercises] = await Promise.all([getWorkoutSplits(), getExercises()]);
  return (
    <SettingsSubPage title="분할" desc="위에서부터 순서대로 돌아가며 운동해요.">
      <SplitsManager initial={splits} exercises={exercises} />
    </SettingsSubPage>
  );
}
