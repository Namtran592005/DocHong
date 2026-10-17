'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api, pageSrc } from '@/lib/api';
import { languageLabel } from '@/lib/format';
import { library, prefs } from '@/lib/library';

interface ReaderProps {
  chapterId: string;
  chapterLabelValue: string;
  chapterTitle: string;
  language: string;
  /** Bản Việt hoá của cùng chương đó, nếu có. */
  vietnameseChapterId?: string | null;
  mangaId: string;
  mangaTitle: string;
  coverFileName?: string;
  groupName?: string;
  groupWebsite?: string;
  totalPages: number;
  pages: string[];
  prevChapter: { id: string; label: string } | null;
  nextChapter: { id: string; label: string } | null;
  hasPages: boolean;
}

const SETTINGS_KEY = 'dochong:reader-open';

export function Reader(props: ReaderProps) {
  const {
    chapterId,
    chapterLabelValue,
    language,
    mangaId,
    mangaTitle,
    coverFileName,
    groupName,
    groupWebsite,
    prevChapter,
    nextChapter: nextChapterRef,
    vietnameseChapterId,
    hasPages,
  } = props;

  const searchParams = useSearchParams();
  const router = useRouter();
  const startPage = Math.max(1, Number(searchParams.get('trang') || 1));

  const [quality, setQuality] = useState<'data' | 'data-saver'>('data');
  const [layout, setLayout] = useState<'scroll' | 'paged'>('scroll');
  const [current, setCurrent] = useState(startPage);
  const [barsVisible, setBarsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageList, setPageList] = useState(props.pages);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastSaved = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = pageList.length;
  const isVietnamese = language === 'vi';

  /* ------------------------------------------------------------ tuỳ chọn */

  useEffect(() => {
    const stored = prefs.get();
    setLayout(stored.readerLayout);
    setQuality(stored.dataSaver ? 'data-saver' : 'data');
    setSettingsOpen(localStorage.getItem(SETTINGS_KEY) === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, settingsOpen ? '1' : '0');
  }, [settingsOpen]);

  const updateLayout = (value: 'scroll' | 'paged') => {
    setLayout(value);
    prefs.update({ readerLayout: value });
  };

  const updateQuality = (value: 'data' | 'data-saver') => {
    setQuality(value);
    prefs.update({ dataSaver: value === 'data-saver' });
  };

  /* ------------------------- đổi chất lượng khi bị chặn mạng di động */

  useEffect(() => {
    if (loadError && quality === 'data') {
      updateQuality('data-saver');
      return;
    }
    api
      .chapterPages(chapterId, quality)
      .then((response) => {
        setPageList(response.pages);
        setLoadError(null);
      })
      .catch((failure: Error) => setLoadError(failure.message));
    // Chỉ chạy khi đổi chương hoặc đổi chất lượng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, quality]);

  /* ----------------------------------------------------- lưu tiến độ đọc */

  const saveProgress = useCallback(
    (page: number) => {
      const now = Date.now();
      if (now - lastSaved.current < 3000) return;
      lastSaved.current = now;
      if (!mangaId || !total) return;
      library.save({
        mangaId,
        title: mangaTitle,
        coverFileName,
        chapterId,
        chapterLabel: chapterLabelValue,
        pageIndex: Math.max(0, page - 1),
        totalPages: total,
        updatedAt: now,
      });
    },
    [chapterId, chapterLabelValue, coverFileName, mangaId, mangaTitle, total],
  );

  useEffect(() => {
    if (!total) return;
    library.markChapterRead(mangaId, chapterId);
    library.pushRecent(mangaId, mangaTitle, coverFileName);
  }, [chapterId, mangaId, mangaTitle, coverFileName, total]);

  /* ------------------------------------------- theo dõi trang đang xem */

  useEffect(() => {
    if (layout !== 'scroll' || !total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.pageIndex ?? 0);
        setCurrent(index + 1);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    pageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [layout, total, pageList]);

  useEffect(() => {
    saveProgress(current);
  }, [current, saveProgress]);

  /* ------------------------------------------------------ điều hướng */

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.min(total, Math.max(1, page));
      setCurrent(target);
      saveProgress(target);
      if (layout !== 'paged') {
        pageRefs.current[target - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [layout, saveProgress, total],
  );

  const nextPage = useCallback(() => goToPage(current + 1), [current, goToPage]);
  const prevPage = useCallback(() => goToPage(current - 1), [current, goToPage]);

  const nextChapter = useCallback(() => {
    if (total) {
      library.save({
        mangaId,
        title: mangaTitle,
        coverFileName,
        chapterId,
        chapterLabel: chapterLabelValue,
        pageIndex: total - 1,
        totalPages: total,
        updatedAt: Date.now(),
      });
    }
    if (nextChapterRef) router.push(`/doc/${nextChapterRef.id}`);
  }, [chapterId, chapterLabelValue, coverFileName, mangaId, mangaTitle, nextChapterRef, router, total]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          if (layout === 'paged') nextPage();
          else toggleBars();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (layout === 'paged') prevPage();
          else toggleBars();
          break;
        case 'Home':
          event.preventDefault();
          goToPage(1);
          break;
        case 'End':
          event.preventDefault();
          goToPage(total);
          break;
        case 'Escape':
          setSettingsOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // toggleBars khai báo bên dưới, dùng trực tiếp ở đây
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, nextPage, prevPage, goToPage, total]);

  function toggleBars() {
    setBarsVisible((visible) => {
      const next = !visible;
      if (next) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setBarsVisible(false), 4000);
      }
      return next;
    });
  }

  const onTouchStart = (event: React.TouchEvent) => {
    const startX = event.touches[0]?.clientX ?? 0;
    const startY = event.touches[0]?.clientY ?? 0;

    const onEnd = (end: globalThis.TouchEvent) => {
      const dx = (end.changedTouches[0]?.clientX ?? 0) - startX;
      const dy = (end.changedTouches[0]?.clientY ?? 0) - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (layout === 'paged') {
          if (dx < 0) nextPage();
          else prevPage();
        } else {
          toggleBars();
        }
      }
    };
    document.addEventListener('touchend', onEnd, { once: true });
  };

  const progress = total ? Math.round((current / total) * 100) : 0;

  const urls = useMemo(
    () => pageList.map((_, index) => pageSrc(chapterId, index, quality)),
    [pageList, chapterId, quality],
  );

  if (!hasPages && !loadError) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-bold">Chương này không có trang đọc</h1>
        <Link
          href={`/truyen/${mangaId}`}
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
        >
          Quay lại bộ truyện
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-reader text-fg" onTouchStart={onTouchStart}>
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Thanh trên */}
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-bg/92 backdrop-blur-lg transition-transform duration-200 ${
          barsVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container-page flex h-14 items-center gap-3">
          <Link
            href={`/truyen/${mangaId}`}
            aria-label="Quay lại trang bộ truyện"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m11 18-6-6 6-6" />
            </svg>
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/truyen/${mangaId}`}
              className="block truncate text-sm font-semibold hover:text-accent"
            >
              {mangaTitle}
            </Link>
            <p className="truncate text-xs text-fg-subtle">
              {chapterLabelValue} · {languageLabel(language)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateLayout(layout === 'scroll' ? 'paged' : 'scroll')}
              aria-label="Đổi kiểu đọc"
              title={layout === 'scroll' ? 'Chuyển sang lật từng trang' : 'Chuyển sang cuộn liên tục'}
              className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {layout === 'scroll' ? (
                <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M7 4h10M7 9h10M7 14h10M7 19h6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <rect x="7" y="4" width="10" height="16" rx="1.5" />
                  <path d="M12 8v8" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-label="Tuỳ chọn đọc"
              className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="border-t border-line bg-surface/80 backdrop-blur">
            <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-4 py-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  Chất lượng ảnh
                </p>
                <div className="flex gap-1.5">
                  {(['data', 'data-saver'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateQuality(value)}
                      aria-pressed={quality === value}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        quality === value
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-line bg-surface-2 text-fg-muted hover:text-fg'
                      }`}
                    >
                      {value === 'data' ? 'Cao' : 'Tiết kiệm dữ liệu'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-52 flex-1">
                <p className="mb-1.5 flex items-center justify-between text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  Thu phóng <span className="tabular-nums">{zoom}%</span>
                </p>
                <input
                  type="range"
                  min={60}
                  max={160}
                  step={10}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Nội dung */}
      <main className={barsVisible ? 'pt-14' : ''}>
        {loadError && !hasPages && (
          <div className="container-page py-24 text-center">
            <p className="font-semibold">Không tải được trang của chương này.</p>
            <p className="mt-1 text-sm text-fg-muted">{loadError}</p>
          </div>
        )}

        {layout === 'scroll' ? (
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 px-0 py-2 sm:gap-2 sm:py-4">
            {urls.map((url, index) => (
              <div
                key={url}
                data-page-index={index}
                ref={(node) => {
                  pageRefs.current[index] = node;
                }}
                className="relative w-full"
                style={zoom !== 100 ? { width: `${zoom}%` } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Trang ${index + 1}`}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="mx-auto block w-full select-none"
                  onError={(event) => {
                    if (quality === 'data') updateQuality('data-saver');
                    else event.currentTarget.style.opacity = '0.15';
                  }}
                />
                <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
                  {index + 1}
                </span>
              </div>
            ))}

            <ChapterFooter prev={prevChapter} next={nextChapterRef} onNext={nextChapter} />
          </div>
        ) : (
          <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-3 py-6">
            {current >= 1 && current <= total && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${current}-${quality}`}
                src={urls[current - 1]}
                alt={`Trang ${current} trên ${total}`}
                className="max-h-[calc(100dvh-9rem)] w-auto max-w-full select-none object-contain"
                onError={(event) => {
                  if (quality === 'data') updateQuality('data-saver');
                  else event.currentTarget.style.opacity = '0.15';
                }}
              />
            )}

            <ChapterFooter prev={prevChapter} next={nextChapterRef} onNext={nextChapter} />
          </div>
        )}
      </main>

      {/* Thanh dưới */}
      <footer
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 backdrop-blur-lg transition-transform duration-200 ${
          barsVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container-page flex h-14 items-center gap-3">
          <button
            type="button"
            onClick={prevPage}
            disabled={current <= 1}
            aria-label="Trang trước"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              type="range"
              min={1}
              max={Math.max(total, 1)}
              value={Math.min(current, Math.max(total, 1))}
              onChange={(event) => goToPage(Number(event.target.value))}
              aria-label="Trang hiện tại"
              className="w-full accent-[var(--accent)]"
            />
            <span className="shrink-0 text-xs tabular-nums text-fg-muted">
              {Math.min(current, total)}/{total || '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={nextPage}
            disabled={current >= total}
            aria-label="Trang sau"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>

          {nextChapterRef ? (
            <button
              type="button"
              onClick={nextChapter}
              className="hidden shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover sm:block"
            >
              Chương sau
            </button>
          ) : (
            <Link
              href={`/truyen/${mangaId}`}
              className="hidden shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover sm:block"
            >
              Về trang truyện
            </Link>
          )}
        </div>
      </footer>

      {/* Nút mở/ẩn thanh điều hướng, chỉ hữu ích với chuột */}
      <button
        type="button"
        onClick={toggleBars}
        aria-label={barsVisible ? 'Ẩn thanh điều hướng' : 'Hiện thanh điều hướng'}
        className="fixed top-1/2 right-0 z-30 grid size-8 -translate-y-1/2 place-items-center rounded-l-lg border border-r-0 border-line bg-bg/80 text-fg-subtle backdrop-blur transition-colors hover:text-fg sm:size-9"
      >
        {barsVisible ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        )}
      </button>

      {!isVietnamese && (
        <div className="container-page pb-6">
          <div className="rounded-xl border border-warn/30 bg-warn/8 px-4 py-3 text-sm text-fg-muted">
            {vietnameseChapterId ? (
              <>
                <strong className="text-warn">Chương này chưa có bản Việt.</strong> Bạn đang đọc bản{' '}
                {languageLabel(language).toLowerCase()}.{' '}
                <Link href={`/doc/${vietnameseChapterId}`} className="font-semibold text-accent hover:underline">
                  Chuyển sang bản Việt hoá
                </Link>
                .
              </>
            ) : (
              <>
                <strong className="text-warn">Chương này chưa có bản Việt.</strong> Đang đọc bản{' '}
                {languageLabel(language).toLowerCase()}.{' '}
                <Link href={`/truyen/${mangaId}`} className="font-semibold text-accent hover:underline">
                  Xem danh sách chương
                </Link>
                .
              </>
            )}
          </div>
        </div>
      )}

      {groupName && (
        <p className="container-page py-6 text-center text-xs text-fg-subtle">
          Bản dịch:{' '}
          {groupWebsite ? (
            <a
              href={groupWebsite}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-accent hover:underline"
            >
              {groupName}
            </a>
          ) : (
            groupName
          )}{' '}
          · Hình ảnh từ MangaDex
        </p>
      )}
    </div>
  );
}

function ChapterFooter({
  prev,
  next,
  onNext,
}: {
  prev: { id: string; label: string } | null;
  next: { id: string; label: string } | null;
  onNext?: () => void;
}) {
  return (
    <nav
      aria-label="Điều hướng chương"
      className="mt-6 grid w-full gap-3 border-t border-line px-4 py-6 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={`/doc/${prev.id}`}
          className="flex flex-col gap-0.5 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-surface"
        >
          <span className="text-[11px] tracking-wide text-fg-subtle uppercase">Chương trước</span>
          <span className="line-clamp-1 text-sm font-medium">{prev.label}</span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {next && (
        <button
          type="button"
          onClick={onNext}
          className="flex flex-col gap-0.5 rounded-xl border border-line px-4 py-3 text-right transition-colors hover:bg-surface"
        >
          <span className="text-[11px] tracking-wide text-fg-subtle uppercase">Chương sau</span>
          <span className="line-clamp-1 text-sm font-medium">{next.label}</span>
        </button>
      )}
    </nav>
  );
}