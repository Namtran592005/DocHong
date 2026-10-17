'use client';

import { useCallback, useEffect, useState } from 'react';

import { CardGridSkeleton } from '@/components/Skeleton';
import { api } from '@/lib/api';
import {
  RankFollowed,
  RankLatest,
  RankRating,
  attachStats,
  type RankListProps,
} from '@/components/search/Ranks';
import type { RankedManga } from '@/components/search/Ranks';

const PAGE_SIZE = 24;

type RankKind = 'latest' | 'followed' | 'rating';

const VIEW: Record<RankKind, { title: string; subtitle: string }> = {
  latest: {
    title: 'Mới cập nhật',
    subtitle: 'Xếp theo chương mới được đăng gần đây nhất',
  },
  followed: {
    title: 'Được theo dõi nhiều',
    subtitle: 'Bảng xếp hạng theo số người theo dõi',
  },
  rating: {
    title: 'Đánh giá cao nhất',
    subtitle: 'Bảng xếp hạng theo điểm cộng đồng chấm (thang 10)',
  },
};

const SWITCHES: { kind: RankKind; href: string; label: string }[] = [
  { kind: 'latest', href: '/tim-kiem?sort=latestUploadedChapter', label: 'Mới cập nhật' },
  { kind: 'followed', href: '/tim-kiem?sort=followedCount', label: 'Được theo dõi' },
  { kind: 'rating', href: '/tim-kiem?sort=rating', label: 'Đánh giá cao' },
];

/**
 * Ba bố cục xếp hạng: mỗi cách sắp xếp có một cách trình bày riêng, vì mục đích
 * của người đọc mỗi bảng khác nhau — xem có gì mới, xem cái gì hot, xem cái gì
 * được chấm điểm cao.
 */
export function RankBoard({ kind }: { kind: RankKind }) {
  const [items, setItems] = useState<RankedManga[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (page: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.manga({
          hasVietnamese: true,
          hasChapters: true,
          orderBy:
            kind === 'latest'
              ? 'latestUploadedChapter'
              : kind === 'followed'
                ? 'followedCount'
                : 'rating',
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });

        const withStats = await attachStats(response.data ?? []);

        setTotal(response.total ?? 0);
        setItems((current) => {
          if (replace) return withStats;
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...withStats.filter((item) => !seen.has(item.id))];
        });
      } catch {
        setError('Không tải được danh sách truyện.');
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  const onMore = useCallback(() => {
    load(Math.floor(items.length / PAGE_SIZE) + 1, false);
  }, [items.length, load]);

  const props: RankListProps = {
    items,
    total,
    shown: items.length,
    onMore,
    loading,
  };

  const view = VIEW[kind];

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{view.title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{view.subtitle}</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-line pb-4">
        {SWITCHES.map((item) => (
          <a
            key={item.kind}
            href={item.href}
            aria-current={item.kind === kind ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              item.kind === kind
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg'
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      {error && items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          {error}
        </p>
      ) : loading && items.length === 0 ? (
        <CardGridSkeleton count={18} />
      ) : items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          Chưa có truyện nào.
        </p>
      ) : kind === 'latest' ? (
        <RankLatest {...props} />
      ) : kind === 'followed' ? (
        <RankFollowed {...props} />
      ) : (
        <RankRating {...props} />
      )}
    </div>
  );
}