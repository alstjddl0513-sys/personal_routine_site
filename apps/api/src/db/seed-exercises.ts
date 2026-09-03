import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { exercises } from './schema';

config({ path: resolve(__dirname, '../../../../.env') });

interface ExerciseSeed {
  name: string;
  targetMuscle: string;
  defaultSets: number;
  repMin: number;
  repMax: number;
}

const EXERCISE_SEED: ExerciseSeed[] = [
  { name: '랫풀다운', targetMuscle: 'back', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '벤치프레스', targetMuscle: 'chest', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '숄더프레스', targetMuscle: 'shoulder', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '케이블·머신 로우', targetMuscle: 'back', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '레터럴 레이즈', targetMuscle: 'shoulder', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '바벨 스쿼트', targetMuscle: 'leg', defaultSets: 3, repMin: 6, repMax: 10 },
  { name: '레그프레스', targetMuscle: 'leg', defaultSets: 3, repMin: 10, repMax: 15 },
  { name: '루마니안 데드리프트', targetMuscle: 'leg', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '레그 익스텐션', targetMuscle: 'leg', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '레그 컬', targetMuscle: 'leg', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '스탠딩 카프 레이즈', targetMuscle: 'leg', defaultSets: 3, repMin: 15, repMax: 20 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }

  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(client);

  try {
    const existing = await db
      .select({ name: exercises.name, sortOrder: exercises.sortOrder })
      .from(exercises);
    const existingNames = new Set(existing.map((r) => r.name));
    const maxSortOrder = existing.reduce(
      (max, r) => (r.sortOrder > max ? r.sortOrder : max),
      -1,
    );

    const missing = EXERCISE_SEED.filter((r) => !existingNames.has(r.name));

    if (missing.length === 0) {
      console.log(`All ${EXERCISE_SEED.length} seed exercises already present. Nothing to do.`);
      return;
    }

    const rows = missing.map((r, i) => ({
      ...r,
      sortOrder: maxSortOrder + 1 + i,
    }));
    await db.insert(exercises).values(rows);
    console.log(
      `Inserted ${rows.length} new exercises (sort_order ${maxSortOrder + 1}~${maxSortOrder + rows.length}):`,
    );
    for (const r of rows) console.log(`  + ${r.name} (${r.targetMuscle})`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
