'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dải cuộn ngang kèm nút mũi tên hai bên.
 *
 * Vuốt bằng tay chỉ tiện trên điện thoại; trên máy tính con trỏ thì nút bấm
 * rõ ràng và nhảy được cả mảng, nên dùng nút là chính, vẫn giữ cuộn ngang cho
 * mobile. Nút tự ẩn khi đã ở đầu hoặc cuối danh sách.
 */
export function ScrollRail({
  children,
  label,
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const sync = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const maxScroll = node.scrollWidth - node.clientWidth;
    setEdge({
      start: node.scrollLeft <= 4,
      end: node.scrollLeft >= maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    sync();
    const node = trackRef.current;
    if (!node) return;

    // Nội dung về sau có thể nạp thêm ảnh, làm bề rộng thay đổi
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    window.addEventListener('resize', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  const scrollBy = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        onScroll={sync}
        aria-label={label}
        className="-mx-4 flex gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:-mx-6 sm:px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {!edge.start && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Cuộn sang trái"
          className="absolute top-1/2 -left-1 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-fg-muted shadow-[var(--shadow-pop)] transition-colors hover:border-accent hover:text-accent lg:grid"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
      )}

      {!edge.end && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Cuộn sang phải"
          className="absolute top-1/2 -right-1 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-fg-muted shadow-[var(--shadow-pop)] transition-colors hover:border-accent hover:text-accent lg:grid"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}