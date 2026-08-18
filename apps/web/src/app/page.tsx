import type { HealthResponse } from '@repo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function fetchHealth(): Promise<HealthResponse | { status: 'error'; db: 'error' }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthResponse;
  } catch {
    return { status: 'error', db: 'error' };
  }
}

export default async function Home() {
  const health = await fetchHealth();
  const apiOk = health.status === 'ok';
  const dbOk = health.db === 'ok';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">routine-site</h1>
      <p className="text-sm text-zinc-500">phase 1 · infra smoke</p>
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${apiOk ? 'bg-emerald-500' : 'bg-rose-500'}`}
          />
          <span>API {apiOk ? 'OK' : 'DOWN'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${dbOk ? 'bg-emerald-500' : 'bg-rose-500'}`}
          />
          <span>DB {dbOk ? 'OK' : 'DOWN'}</span>
        </div>
      </div>
      <code className="text-xs text-zinc-500">{API_BASE}/health</code>
    </main>
  );
}
