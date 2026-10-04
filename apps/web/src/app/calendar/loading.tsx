import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-40" />
      </header>
      <Skeleton className="h-[32rem]" />
    </div>
  );
}
