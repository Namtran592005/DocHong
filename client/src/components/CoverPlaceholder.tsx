'use client';

import Image from 'next/image';

/**
 * Khung chờ ảnh bìa: tốt hơn nhiều so với để trống, vừa giữ bố cục ổn định
 * vừa tạo cảm giác "đang tải" thay vì trang bị lỗi.
 */
export function CoverPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`grid h-full w-full place-items-center bg-surface-2 ${className}`}
      role="img"
      aria-label="Chưa có ảnh bìa"
    >
      <Image
        src="/logo-mark.png"
        alt=""
        width={120}
        height={90}
        className="w-1/2 max-w-24 opacity-15 grayscale select-none"
      />
    </div>
  );
}