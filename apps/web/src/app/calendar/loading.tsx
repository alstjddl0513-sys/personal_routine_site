import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold">캘린더</h1>
      </header>
      <Skeleton className="h-40" />
    </div>
  );
}
