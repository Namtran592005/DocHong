'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Thanh tiến trình toàn trang. Khi người đọc bấm vào một bộ truyện, thanh hiện
 * ngay lập tức thay vì trang đứng yên không phản hồi vài giây.
 *
 * Đường dẫn thay đổi là tín hiệu điều hướng đã xong; giữ thanh thêm một nhịp
 * ngắn để mắt kịp nhận biết.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() ?? ''}`;

  const [active, setActive] = useState(false);
  const previous = useRef(key);

  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;

    setActive(true);
    const timer = setTimeout(() => setActive(false), 350);
    return () => clearTimeout(timer);
  }, [key]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={active}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="sr-only">Đang tải trang</span>
      <span className="block h-full overflow-hidden bg-accent/20">
        <span className="block h-full w-1/3 animate-[shimmer_1.1s_ease-in-out_infinite] bg-accent" />
      </span>
    </div>
  );
}