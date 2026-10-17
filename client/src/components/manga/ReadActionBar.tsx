'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { library } from '@/lib/library';
import { chapterShortLabel, mangaTitle } from '@/lib/format';
import type { Chapter, Manga } from '@/lib/types';

export function ReadActionBar({
  manga,
  firstChapter,
}: {
  manga: Manga;
  firstChapter: Chapter | null;
}) {
  const mangaId = manga.id;
  const title = mangaTitle(manga);

  const [entry, setEntry] = useState<ReturnType<typeof library.get>>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntry(library.get(mangaId));
    setMounted(true);
  }, [mangaId]);

  const percent =
    entry && entry.totalPages > 0
      ? Math.min(100, Math.round(((entry.pageIndex + 1) / entry.totalPages) * 100))
      : 0;

  const toggleBookmark = () => {
    if (!entry) {
      if (!firstChapter) return;
      library.save({
        mangaId,
        title,
        coverFileName: manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes
          ?.fileName,
        chapterId: firstChapter.id,
        chapterLabel: chapterShortLabel(firstChapter),
        pageIndex: 0,
        totalPages: 0,
        updatedAt: Date.now(),
      });
    } else {
      library.remove(mangaId);
    }
    setEntry(library.get(mangaId));
  };

  if (!firstChapter) {
    return (
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface-2 px-4 py-4 text-sm text-fg-muted">
        Bộ truyện này hiện chưa có chương nào để đọc.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link
          href={entry ? `/doc/${entry.chapterId}?trang=${entry.pageIndex + 1}` : `/doc/${firstChapter.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.5-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
          </svg>
          {entry ? 'Tiếp tục đọc' : 'Đọc chương mới nhất'}
        </Link>

        <button
          type="button"
          onClick={toggleBookmark}
          disabled={!mounted}
          aria-pressed={Boolean(entry)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill={entry ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" />
          </svg>
          {entry ? 'Đã lưu' : 'Lưu truyện'}
        </button>
      </div>

      {entry && entry.totalPages > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </span>
          <span className="shrink-0 text-xs tabular-nums text-fg-muted">
            Trang {entry.pageIndex + 1}/{entry.totalPages} · {percent}%
          </span>
          <button
            type="button"
            onClick={() => {
              library.remove(mangaId);
              setEntry(library.get(mangaId));
            }}
            className="shrink-0 text-xs text-fg-subtle transition-colors hover:text-danger"
            title="Xoá tiến độ đọc"
          >
            Xoá
          </button>
        </div>
      )}
    </div>
  );
}