import Image from 'next/image';
import Link from 'next/link';

import { StatusPill } from '@/components/Badge';
import { CoverPlaceholder } from '@/components/CoverPlaceholder';
import { ScrollRail } from '@/components/ui/ScrollRail';
import { coverSrc } from '@/lib/api';
import { STATUS_LABEL, chapterCountHint, mangaTitle } from '@/lib/format';
import type { Manga } from '@/lib/types';

/* ------------------------------------------------------------------ dùng chung */

function ShelfFrame({
  title,
  subtitle,
  href,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
          <p className="mt-0.5 truncate text-xs text-fg-subtle sm:text-sm">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-80"
          >
            Xem tất cả
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function StateMessage({ text }: { text: string }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-8 text-center text-sm text-fg-muted">
      {text}
    </p>
  );
}

function coverOf(manga: Manga, size: string) {
  const fileName = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes
    ?.fileName;
  return coverSrc(manga.id, fileName, size);
}

/** Ảnh bìa có sẵn thì dùng, không có thì hiện khung logo mờ. */
function Thumb({
  manga,
  size,
  eager = false,
}: {
  manga: Manga;
  size: string;
  eager?: boolean;
}) {
  const src = coverOf(manga, size);
  if (!src) return <CoverPlaceholder />;
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={size === '.256.jpg' ? '164px' : '220px'}
      loading={eager ? 'eager' : 'lazy'}
      // Ảnh eager mặc định còn bị Next thêm <link rel="preload">. Tắt đi:
      // preload cho cả 6 ảnh sẽ cạnh tranh với ảnh bìa nổi bật (LCP) và dễ
      // gây lại cảnh báo "preload nhưng không dùng".
      preload={false}
      className="object-cover"
    />
  );
}

/* ------------------------------------------------- 1. Mới cập nhật: cuộn ngang */

/**
 * Dải cuộn ngang có bám dấu: cảm giác như dòng thời gian, hợp với "mới cập nhật"
 * hơn là một lưới ô vuông giống hệt các kệ khác.
 */
export function ShelfLatest({ items }: { items: Manga[] }) {
  return (
    <ShelfFrame
      title="Mới cập nhật"
      subtitle="Chương Việt hoá mới được đăng gần đây nhất"
      href="/tim-kiem?sort=latestUploadedChapter"
    >
      <ScrollRail label="Truyện mới cập nhật">
        {items.map((manga, index) => (
          <div key={manga.id} className="w-[140px] shrink-0 sm:w-[164px]">
            <Link href={`/truyen/${manga.id}`} className="group block">
              <div className="relative aspect-3/4 overflow-hidden rounded-xl border border-line bg-surface-2">
                <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                  <Thumb manga={manga} size=".256.jpg" eager={index < 8} />
                </div>
                <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  #{index + 1}
                </span>
              </div>
              <p className="mt-2 line-clamp-2-safe text-xs leading-tight font-semibold group-hover:text-accent">
                {mangaTitle(manga)}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                {chapterCountHint(manga)}
              </p>
            </Link>
          </div>
        ))}
      </ScrollRail>
    </ShelfFrame>
  );
}

/* --------------------------------------------- 2. Được theo dõi: bảng xếp hạng */

/**
 * Bảng xếp hạng đánh số thứ tự: nhấn mạnh "top" và dễ so sánh hơn lưới ô vuông.
 */
export function ShelfTopFollowed({ items }: { items: Manga[] }) {
  return (
    <ShelfFrame
      title="Được theo dõi nhiều"
      subtitle="Bộ truyện đang được đông đảo độc giả quan tâm nhất"
      href="/tim-kiem?sort=followedCount"
    >
      <ScrollRail label="Truyện được theo dõi nhiều">
        <ol className="flex gap-2.5">
          {items.map((manga, index) => (
            <div key={manga.id} className="w-[240px] shrink-0 sm:w-[300px]">
            <Link
              href={`/truyen/${manga.id}`}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2 transition-colors hover:border-accent/50"
            >
              <span
                className={`w-7 shrink-0 text-center text-lg leading-none font-black tabular-nums ${
                  index < 3 ? 'text-accent' : 'text-fg-subtle'
                }`}
              >
                {index + 1}
              </span>

              <div className="relative aspect-3/4 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                <Thumb manga={manga} size=".256.jpg" />
              </div>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="line-clamp-2-safe text-[13px] leading-tight font-semibold group-hover:text-accent">
                  {mangaTitle(manga)}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-subtle">
                  <StatusPill
                    status={manga.attributes.status}
                    label={STATUS_LABEL[manga.attributes.status]}
                  />
                  <span>{chapterCountHint(manga)}</span>
                </span>
              </span>
            </Link>
            </div>
          ))}
        </ol>
      </ScrollRail>
    </ShelfFrame>
  );
}

/* ----------------------------------------------- 3. Đánh giá cao: lưới có nhãn */

/** Lưới nhưng mỗi thẻ mang nhãn điểm, phân biệt rõ với lưới mặc định. */
export function ShelfTopRated({ items }: { items: Manga[] }) {
  return (
    <ShelfFrame
      title="Đánh giá cao nhất"
      subtitle="Bộ truyện được cộng đồng chấm điểm tốt nhất"
      href="/tim-kiem?sort=rating"
    >
      <ScrollRail label="Truyện đánh giá cao nhất">
        {items.map((manga, index) => (
          <Link
            key={manga.id}
            href={`/truyen/${manga.id}`}
            className="group flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition hover:border-accent/50 sm:w-[190px]"
          >
            <div className="relative aspect-3/4 w-full overflow-hidden bg-surface-2">
              <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                <Thumb manga={manga} size=".256.jpg" />
              </div>

              {/* Nhãn huy chương đè lên góc bìa */}
              <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg shadow-sm">
                <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.34 6.19 20.4 7.3 13.93 2.6 9.35l6.5-.95L12 2.5z" />
                </svg>
                {index < 3 ? 'TOP' : chapterCountHint(manga)}
              </span>

              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent" />
              <span className="absolute right-2 bottom-1.5 left-2 text-[10px] font-medium text-white/85">
                {STATUS_LABEL[manga.attributes.status]}
              </span>
            </div>

            <span className="flex flex-col gap-1 p-2.5">
              <span className="line-clamp-2-safe text-[13px] leading-tight font-semibold group-hover:text-accent">
                {mangaTitle(manga)}
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${100 - Math.min(index * 9, 70)}%` }}
                />
              </span>
            </span>
          </Link>
        ))}
      </ScrollRail>
    </ShelfFrame>
  );
}

/* ------------------------------------------------------------ trạng thái lỗi */

export function ShelfError({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <ShelfFrame title={title} subtitle={subtitle} href={href}>
      <StateMessage text="Chưa tải được danh sách này. Vui lòng tải lại trang sau ít giây." />
    </ShelfFrame>
  );
}

export function ShelfEmpty({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <ShelfFrame title={title} subtitle={subtitle} href={href}>
      <StateMessage text="Chưa có bộ truyện nào phù hợp ở mục này." />
    </ShelfFrame>
  );
}

export { ShelfFrame };