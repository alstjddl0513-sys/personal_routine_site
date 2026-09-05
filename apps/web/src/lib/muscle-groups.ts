export type MuscleGroup = 'upper' | 'lower' | 'other';
export type MuscleGroupFilter = 'all' | MuscleGroup;

export interface MuscleOption {
  key: string;
  label: string;
  group: 'upper' | 'lower';
}

// 부위 값의 정본. classifyMuscleGroup / muscleLabel 둘 다 여기서 파생.
// 새 부위 추가는 여기 한 줄로 끝나고 select/필터/뱃지 전부 자동 반영.
export const MUSCLE_OPTIONS: MuscleOption[] = [
  { key: 'back', label: '등', group: 'upper' },
  { key: 'chest', label: '가슴', group: 'upper' },
  { key: 'shoulder', label: '어깨', group: 'upper' },
  { key: 'arm', label: '팔', group: 'upper' },
  { key: 'leg', label: '다리', group: 'lower' },
];

const MUSCLE_BY_KEY = new Map(MUSCLE_OPTIONS.map((o) => [o.key, o]));

export function classifyMuscleGroup(targetMuscle: string | null): MuscleGroup {
  if (!targetMuscle) return 'other';
  const key = targetMuscle.trim().toLowerCase();
  const opt = MUSCLE_BY_KEY.get(key);
  return opt ? opt.group : 'other';
}

// 알려진 key면 한글 라벨, 아니면 원본을 그대로 (레거시/커스텀 값 보호).
export function muscleLabel(targetMuscle: string | null): string | null {
  if (!targetMuscle) return null;
  const key = targetMuscle.trim().toLowerCase();
  return MUSCLE_BY_KEY.get(key)?.label ?? targetMuscle;
}

export function parseGroupFilter(raw: string | undefined): MuscleGroupFilter {
  if (raw === 'upper' || raw === 'lower' || raw === 'other') return raw;
  return 'all';
}

export const GROUP_TABS: { key: MuscleGroupFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'upper', label: '상체' },
  { key: 'lower', label: '하체' },
];
