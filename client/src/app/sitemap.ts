import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Sitemap được sinh theo domain đang chạy, nên bản build có thể đưa lên bất kỳ
 * tên miền nào mà không phải sửa lại.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const now = new Date();

  const entries: {
    path: string;
    priority: number;
    frequency: 'hourly' | 'daily' | 'weekly';
  }[] = [
    { path: '/', priority: 1, frequency: 'hourly' },
    { path: '/tim-kiem', priority: 0.9, frequency: 'hourly' },
    { path: '/tim-kiem?sort=latestUploadedChapter', priority: 0.8, frequency: 'hourly' },
    { path: '/tim-kiem?sort=followedCount', priority: 0.8, frequency: 'daily' },
    { path: '/tim-kiem?sort=rating', priority: 0.7, frequency: 'daily' },
    { path: '/tim-kiem?view=genres', priority: 0.6, frequency: 'weekly' },
    { path: '/gioi-thieu', priority: 0.4, frequency: 'weekly' },
    { path: '/lien-he', priority: 0.3, frequency: 'weekly' },
    { path: '/chinh-sach', priority: 0.3, frequency: 'weekly' },
    { path: '/dmca', priority: 0.3, frequency: 'weekly' },
  ];

  return entries.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.frequency,
    priority: entry.priority,
  }));
}