import { CardGridSkeleton, Skeleton } from '@/components/Skeleton';

/** Khung chờ khi đổi bộ lọc hoặc từ khoá tìm kiếm. */
export default function Loading() {
  return (
    <div className="container-page py-6 sm:py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[268px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[600px] w-full rounded-[var(--radius-card)] lg:block" />

        <div className="min-w-0">
          <Skeleton className="mb-4 h-5 w-52" />
          <CardGridSkeleton count={18} />
        </div>
      </div>
    </div>
  );
}