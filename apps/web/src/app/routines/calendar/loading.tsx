import { Skeleton } from '../../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">루틴 캘린더</h1>
        <Skeleton className="h-8 w-32" />
      </header>
      <Skeleton className="h-96" />
    </div>
  );
}
