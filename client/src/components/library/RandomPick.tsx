'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { mangaTitle } from '@/lib/format';
import type { Manga } from '@/lib/types';

/**
 * `/manga/random` có giới hạn riêng, nên chỉ gọi khi người đọc bấm nút —
 * không tự động gọi liên tục để dựng danh sách cuộn vô hạn.
 */
export function RandomPick() {
  const [items, setItems] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.randomManga();
      setItems(response.data ? [response.data] : []);
    } catch {
      setError('Chưa lấy được gợi ý ngẫu nhiên. Vui lòng thử lại sau ít giây.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="ngau-nhien"
      className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ngau-nhien" className="text-lg font-bold tracking-tight">
            Ngẫu nhiên
          </h2>
        </div>
        <button
          type="button"
          onClick={pick}
          disabled={loading}
          className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          {loading ? 'Đang lấy…' : items.length ? 'Chọn bộ khác' : 'Gợi ý ngẫu nhiên'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((manga) => (
            <li key={manga.id}>
              <Link
                href={`/truyen/${manga.id}`}
                className="flex h-full flex-col justify-center rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-accent"
              >
                <p className="line-clamp-2-safe text-sm font-semibold hover:text-accent">
                  {mangaTitle(manga)}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {(manga.attributes.availableTranslatedLanguages ?? [])
                    .filter((code) => code === 'vi')
                    .length > 0
                    ? 'Đã có bản Việt hoá'
                    : 'Chưa có bản Việt'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && !loading && !error && (
        <p className="mt-4 text-sm text-fg-subtle">Chưa có gợi ý nào.</p>
      )}
    </section>
  );
}