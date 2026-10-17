'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { coverSrc } from '@/lib/api';
import { library } from '@/lib/library';
import type { LibraryEntry } from '@/lib/types';

/**
 * Tiến độ đọc nằm hoàn toàn trên máy người đọc (localStorage).
 * Không có Bearer token MangaDex nào ở frontend — xem mục 7 và mục 22 của tài liệu.
 */
export function ContinueReading() {
  const [items, setItems] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(library.inProgress().slice(0, 6));
    setReady(true);
  }, []);

  if (!ready || items.length === 0) return null;

  return (
    <section aria-labelledby="tiep-tuc-doc">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <h2 id="tiep-tuc-doc" className="text-lg font-bold tracking-tight">
          Tiếp tục đọc
        </h2>
        <button
          type="button"
          onClick={() => setItems([])}
          className="text-xs text-fg-subtle transition-colors hover:text-danger"
        >
          Ẩn
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const src = coverSrc(item.mangaId, item.coverFileName, '.256.jpg');
          const percent =
            item.totalPages > 0
              ? Math.min(100, Math.round(((item.pageIndex + 1) / item.totalPages) * 100))
              : 0;

          return (
            <Link
              key={item.mangaId}
              href={`/doc/${item.chapterId}?trang=${item.pageIndex + 1}`}
              className="group flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-2.5 transition-colors hover:border-line-strong"
            >
              <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-16">
                {src ? (
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" loading="lazy" />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                <p className="line-clamp-2-safe text-[13px] leading-tight font-semibold group-hover:text-accent">
                  {item.title}
                </p>
                <p className="truncate text-xs text-fg-muted">{item.chapterLabel}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">{percent}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}