import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Đường dẫn đọc truyện không cần index, giúp tập trung thứ hạng vào
        // trang chi tiết bộ truyện.
        disallow: ['/api/', '/doc/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}