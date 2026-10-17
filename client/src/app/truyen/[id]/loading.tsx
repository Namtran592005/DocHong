import { Skeleton } from '@/components/Skeleton';

/**
 * Hiện ngay khi người đọc bấm vào một bộ truyện, trong lúc máy chủ đang lấy
 * metadata, danh sách chương và truyện tương tự. Không có file này thì trang
 * trắng trơn cho tới khi dữ liệu về.
 */
export default function Loading() {
  return (
    <div className="container-page py-6 sm:py-8">
      <Skeleton className="mb-4 h-3 w-56" />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <Skeleton className="aspect-3/4 w-full rounded-[var(--radius-card)]" />
        </div>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>

          <Skeleton className="h-9 w-4/5 sm:w-2/3" />

          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-20 rounded-lg" />
            ))}
          </div>

          <div className="flex gap-2.5 pt-2">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>

          <div className="space-y-2 pt-3">
            <Skeleton className="h-3.5 w-24" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-3.5 w-full" />
            ))}
          </div>

          <div className="space-y-2 pt-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}