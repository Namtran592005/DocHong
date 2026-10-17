import type { NextConfig } from 'next';

/**
 * Website không phụ thuộc vào một tên miền cụ thể. `NEXT_PUBLIC_API_ORIGIN` chỉ
 * cần đặt khi proxy nằm ở máy khác; còn lại dùng địa chỉ mặc định và đường dẫn
 * /api, /img được chuyển tiếp sang proxy.
 */
const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_ORIGIN?.trim() ||
  process.env.API_ORIGIN?.trim() ||
  'http://localhost:4000'
).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Chỉ được tối ưu ảnh đi qua máy chủ của bạn. Thiếu khai báo logo ở đây
    // thì next/image trả 400 "url parameter is not allowed" và ảnh hỏng.
    localPatterns: [
      { pathname: '/img/cover/**' },
      { pathname: '/logo.png' },
      { pathname: '/logo.webp' },
      { pathname: '/logo-mark.png' },
      { pathname: '/logo-mark.webp' },
      { pathname: '/logo-og.png' },
    ],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/webp'],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/img/:path*', destination: `${API_ORIGIN}/img/:path*` },
    ];
  },
};

export default nextConfig;