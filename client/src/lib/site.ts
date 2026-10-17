/**
 * Địa chỉ web dùng cho metadata, sitemap và robots.
 *
 * Thứ tự ưu tiên:
 *   1. Biến môi trường NEXT_PUBLIC_SITE_URL (dùng khi cần một tên miền cố định)
 *   2. Host của request hiện tại (dùng khi chạy sau reverse proxy)
 *   3. Giá trị mặc định lúc phát triển
 *
 * Nhờ vậy bản build chạy được trên bất kỳ tên miền nào mà không phải sửa lại mã.
 * File này chỉ dùng ở phía server — không import vào component client.
 */
import { headers } from 'next/headers';

import { setApiOrigin } from './api';

export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return normalize(fromEnv);

  try {
    const store = await headers();
    const host = store.get('x-forwarded-host') ?? store.get('host');
    if (host) {
      const proto =
        store.get('x-forwarded-proto')?.split(',')[0].trim() ??
        (isLocal(host) ? 'http' : 'https');
      return normalize(`${proto}://${host}`);
    }
  } catch {
    // Không có request context (ví dụ build static) — dùng giá trị mặc định
  }

  return 'http://localhost:3000';
}

/**
 * Gốc của proxy MangaDex khi Next render ở phía server.
 *
 * Cố ý KHÔNG lấy từ host của request: nếu chạy sau reverse proxy thì domain công
 * cộng có thể không truy cập lại được vào chính nó. Thay vào đó gọi thẳng địa
 * chỉ nội bộ của proxy.
 */
export function getApiOrigin(): string {
  const fromEnv =
    process.env.API_ORIGIN?.trim() || process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  return normalize(fromEnv || 'http://localhost:4000');
}

/** Gọi một lần ở đầu mỗi trang render phía server. */
export async function initRequestContext(): Promise<void> {
  setApiOrigin(getApiOrigin());
}

function isLocal(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
}

function normalize(value: string): string {
  return value.replace(/\/+$/, '');
}