/** Khung xám nhấp nháy dùng chung cho mọi trạng thái đang tải. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Phủ mờ màn hình khi điều hướng, có nhãn cho trình đọc màn hình. */
export function PageProgress({ label = 'Đang tải trang' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
    >
      <span className="sr-only">{label}</span>
      <span className="h-0.5 w-full overflow-hidden bg-accent/20">
        <span className="block h-full w-1/3 animate-[shimmer_1.2s_ease-in-out_infinite] bg-accent" />
      </span>
    </div>
  );
}

/** Lưới thẻ truyện đang tải — dùng ở trang tìm kiếm. */
export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
        >
          <Skeleton className="aspect-3/4 w-full rounded-none" />
          <div className="space-y-2 p-2.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}