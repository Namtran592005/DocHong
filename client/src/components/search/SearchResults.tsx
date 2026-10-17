'use client';

import { useCallback, useEffect, useState } from 'react';

import { MangaGrid, MangaGridSkeleton } from '@/components/MangaCard';
import { Button, EmptyState, ErrorState, InlineError } from '@/components/ui';
import { api, type MangaQuery } from '@/lib/api';
import type { CollectionResponse, Manga } from '@/lib/types';

export function SearchResults({
  initial,
  query,
  pageSize,
  title,
  error = false,
}: {
  initial: CollectionResponse<Manga>;
  query: MangaQuery;
  pageSize: number;
  title: string;
  error?: boolean;
}) {
  const [items, setItems] = useState<Manga[]>(initial.data ?? []);
  const [total, setTotal] = useState(initial.total ?? 0);
  const [offset, setOffset] = useState(initial.offset ?? 0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    error ? 'Không tải được danh sách truyện.' : null,
  );

  // Đổi bộ lọc => server render lại trang và truyền prop mới xuống.
  useEffect(() => {
    setItems(initial.data ?? []);
    setTotal(initial.total ?? 0);
    setOffset(initial.offset ?? 0);
    setLoadError(error ? 'Không tải được danh sách truyện.' : null);
  }, [initial, error]);

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    setLoading(true);
    setLoadError(null);
    try {
      const nextOffset = offset + pageSize;
      const response = await api.manga({ ...query, offset: nextOffset });
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(response.data ?? []).filter((item) => !seen.has(item.id))];
      });
      setTotal(response.total ?? total);
      setOffset(nextOffset);
    } catch (failure) {
      setLoadError(
        failure instanceof Error
          ? failure.message
          : 'Không tải thêm được danh sách truyện.',
      );
    } finally {
      setLoading(false);
    }
  }, [items.length, loading, offset, pageSize, query, total]);

  if (error && items.length === 0) {
    return <ErrorState message="Không tải được danh sách truyện." retryHref="/tim-kiem" />;
  }

  if (items.length === 0) {
    return <EmptyState title="Không tìm thấy truyện phù hợp" />;
  }

  const hasMore = items.length < total;

  return (
    <section aria-labelledby="ket-qua">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <h2 id="ket-qua" className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-fg-muted">
          {total.toLocaleString('vi-VN')} truyện
        </p>
      </div>

      <MangaGrid items={items} />

      {loadError && <InlineError message={loadError} />}

      <div className="mt-8 flex justify-center">
        {hasMore && (
          <Button onClick={loadMore} disabled={loading} className="w-full sm:w-auto sm:min-w-52">
            {loading ? 'Đang tải…' : 'Xem thêm'}
          </Button>
        )}
      </div>

      {loading && items.length > 0 && (
        <div className="mt-6">
          <MangaGridSkeleton count={6} />
        </div>
      )}
    </section>
  );
}