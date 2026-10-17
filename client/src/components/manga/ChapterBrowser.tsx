'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button, InlineError } from '@/components/ui';
import { api } from '@/lib/api';
import {
  LANGUAGE_VIETNAMESE,
  chapterLabel,
  formatDate,
  languageLabel,
  relationName,
  relativeTime,
  sortedLanguages,
} from '@/lib/format';
import { library } from '@/lib/library';
import type { Chapter, CollectionResponse } from '@/lib/types';

const PAGE_SIZE = 100;

/** Rút gọn dãy số trang: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('gap');
    result.push(page);
    previous = page;
  }
  return result;
}

export function ChapterBrowser({
  mangaId,
  languages,
  initialFeed,
}: {
  mangaId: string;
  languages: string[];
  initialFeed: CollectionResponse<Chapter> | null;
}) {
  const [language, setLanguage] = useState(
    languages.includes(LANGUAGE_VIETNAMESE) ? LANGUAGE_VIETNAMESE : (languages[0] ?? ''),
  );
  const [page, setPage] = useState(1);
  const [chapters, setChapters] = useState<Chapter[]>(initialFeed?.data ?? []);
  const [total, setTotal] = useState(initialFeed?.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialFeed ? null : 'Không tải được danh sách chương.',
  );
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(false);

  const hasVietnamese = languages.includes(LANGUAGE_VIETNAMESE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setReadChapters(library.readChapters(mangaId));
  }, [mangaId]);

  // Đổi ngôn ngữ thì luôn quay về trang 1
  useEffect(() => {
    setPage(1);
  }, [language]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .chapterFeed(mangaId, language ? [language] : undefined, PAGE_SIZE, (page - 1) * PAGE_SIZE)
      .then((response) => {
        if (!active) return;
        setChapters(response.data ?? []);
        setTotal(response.total ?? 0);
      })
      .catch(() => {
        if (active) setError('Không tải được danh sách chương.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mangaId, language, page]);

  const ordered = useMemo(() => {
    if (!sortAsc) return chapters;
    return [...chapters].sort((a, b) =>
      (a.attributes.chapter ?? '').localeCompare(b.attributes.chapter ?? '', undefined, {
        numeric: true,
      }),
    );
  }, [chapters, sortAsc]);

  // Cuộn lên đầu danh sách mỗi khi chuyển trang
  useEffect(() => {
    document.getElementById('danh-sach-chuong')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, language]);

  const goToPage = (value: number) => {
    if (value < 1 || value > pageCount) return;
    setPage(value);
  };

  const tabs = useMemo(() => sortedLanguages(languages), [languages]);

  if (error && chapters.length === 0) {
    return (
      <div className="card-surface px-5 py-10 text-center">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasVietnamese && (
        <p className="rounded-xl border border-warn/30 bg-warn/8 px-4 py-2.5 text-sm text-fg-muted">
          <strong className="text-warn">Chưa có bản Việt hoá.</strong> Đang hiển thị bản gốc.
        </p>
      )}

      {tabs.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={language === code}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                language === code
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {languageLabel(code)}
            </button>
          ))}
        </div>
      )}

      {ordered.length === 0 && !loading ? (
        <div className="card-surface px-5 py-10 text-center">
          <p className="font-medium">
            {language === LANGUAGE_VIETNAMESE
              ? 'MangaDex chưa có chương nào bản tiếng Việt'
              : 'Ngôn ngữ này chưa có chương nào'}
          </p>
        </div>
      ) : (
        <>
          <ul
            id="danh-sach-chuong"
            className={`card-surface divide-y divide-[var(--line)] overflow-hidden transition-opacity ${
              loading ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {ordered.map((chapter) => {
              const group = chapter.relationships?.find((rel) => rel.type === 'scanlation_group');
              const isRead = readChapters.includes(chapter.id);

              return (
                <li key={chapter.id}>
                  <Link
                    href={`/doc/${chapter.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={`hidden size-1.5 shrink-0 rounded-full sm:block ${
                        isRead ? 'bg-ok' : 'bg-transparent'
                      }`}
                      title={isRead ? 'Đã đọc' : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2-safe block text-sm font-medium group-hover:text-accent">
                        {chapterLabel(chapter.attributes)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-fg-subtle">
                        <span title={chapter.attributes.publishAt ?? ''}>
                          {relativeTime(chapter.attributes.publishAt) ||
                            formatDate(chapter.attributes.publishAt)}
                        </span>
                        {group && <span className="truncate">{relationName(group)}</span>}
                        {chapter.attributes.pages > 0 && (
                          <span>{chapter.attributes.pages} trang</span>
                        )}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-fg-subtle">
              Trang {page}/{pageCount} · {total.toLocaleString('vi-VN')} chương
            </p>
            <Button
              variant="ghost"
              onClick={() => setSortAsc((value) => !value)}
              title="Đổi thứ tự chương"
            >
              {sortAsc ? 'Mới nhất trước' : 'Cũ nhất trước'}
            </Button>
          </div>

          {pageCount > 1 && (
            <nav aria-label="Phân trang chương" className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1 || loading}
                aria-label="Trang trước"
                className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>

              {pageNumbers(page, pageCount).map((item, index) =>
                item === 'gap' ? (
                  <span key={`gap-${index}`} className="px-1 text-sm text-fg-subtle">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    aria-current={item === page ? 'page' : undefined}
                    disabled={loading}
                    className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-medium tabular-nums transition-colors ${
                      item === page
                        ? 'border-accent bg-accent text-accent-fg'
                        : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page === pageCount || loading}
                aria-label="Trang sau"
                className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </nav>
          )}
        </>
      )}

      {error && chapters.length > 0 && <InlineError message={error} />}
    </div>
  );
}