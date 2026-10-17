import { Skeleton } from '@/components/Skeleton';

/** Khung chờ khi mở trang đọc: thanh trên, trang truyện và thanh điều hướng. */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-reader">
      <div className="h-14 border-b border-line bg-bg/90" />

      <div className="container-page flex flex-col items-center gap-3 py-6">
        <Skeleton className="h-3 w-52" />
        <Skeleton className="aspect-3/4 w-full max-w-md rounded-lg" />
        <Skeleton className="aspect-3/4 w-full max-w-md rounded-lg" />
      </div>

      <div className="h-14 border-t border-line bg-bg/90" />
    </div>
  );
}