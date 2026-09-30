import { Skeleton } from '../../components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">채용 리스트</h1>
      </header>
      <Skeleton className="h-11 max-w-sm" />
      <Skeleton className="h-52" />
      <Skeleton className="h-64" />
    </div>
  );
}
