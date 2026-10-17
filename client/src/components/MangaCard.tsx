import Image from 'next/image';
import Link from 'next/link';

import { StatusPill } from '@/components/Badge';
import { CoverPlaceholder } from '@/components/CoverPlaceholder';
import { coverSrc } from '@/lib/api';
import { STATUS_LABEL, hasVietnamese, mangaTitle, relationName } from '@/lib/format';
import type { Manga } from '@/lib/types';

function Cover({
  mangaId,
  fileName,
  alt,
  priority = false,
  eager = false,
}: {
  mangaId: string;
  fileName?: string;
  alt: string;
  priority?: boolean;
  eager?: boolean;
}) {
  const src = coverSrc(mangaId, fileName);
  if (!src) return <CoverPlaceholder />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 15vw"
      // `priority` chỉ dành cho ảnh LCP: nó sinh thêm <link rel="preload">,
      // và nếu ảnh nằm ngoài khung nhìn thì trình duyệt báo "preload nhưng
      // không dùng". Ảnh trong khung nhìn đầu chỉ cần tải ngay nên dùng
      // `eager` — không sinh preload mà vẫn không bị Edge cảnh báo lazy.
      priority={priority}
      loading={eager ? 'eager' : 'lazy'}
      className="object-cover"
    />
  );
}

export function MangaCard({
  manga,
  priority = false,
  eager = false,
  showAuthor = true,
}: {
  manga: Manga;
  priority?: boolean;
  eager?: boolean;
  showAuthor?: boolean;
}) {
  const { attributes, id } = manga;
  const title = mangaTitle(manga);
  const fileName = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;
  const author = showAuthor ? relationName(manga.relationships?.find((rel) => rel.type === 'author')) : '';
  const vietnamese = hasVietnamese(manga);

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong">
      <Link
        href={`/truyen/${id}`}
        className="relative block aspect-3/4 w-full overflow-hidden bg-surface-2"
        aria-label={title}
      >
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]">
          <Cover
            mangaId={id}
            fileName={fileName}
            alt={`Bìa truyện ${title}`}
            priority={priority}
            eager={eager}
          />
        </div>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <StatusPill
            status={attributes.status}
            label={STATUS_LABEL[attributes.status] ?? attributes.status}
          />
          {attributes.year && (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {attributes.year}
            </span>
          )}
        </div>

        {!vietnamese && (
          <span className="absolute inset-x-0 bottom-0 bg-amber-500 px-2 py-1 text-center text-[10px] font-semibold text-black">
            Chưa có bản Việt
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
        <Link href={`/truyen/${id}`} className="min-w-0">
          <h3 className="line-clamp-2-safe text-[13px] leading-tight font-semibold text-fg transition-colors group-hover:text-accent sm:text-sm">
            {title}
          </h3>
        </Link>
        {author && (
          <p className="truncate text-[11px] text-fg-subtle" title={author}>
            {author}
          </p>
        )}
      </div>
    </article>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="skeleton aspect-3/4 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="skeleton h-3.5 w-4/5" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export function MangaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <MangaCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * `eagerCount` là số thẻ ở đầu lưới nằm trong khung nhìn đầu tiên, được tải
 * ngay. Giữ giá trị này bằng số cột của lưới trên màn rộng để không tải thừa.
 */
export function MangaGrid({ items, eagerCount = 6 }: { items: Manga[]; eagerCount?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((manga, index) => (
        <MangaCard key={manga.id} manga={manga} eager={index < eagerCount} />
      ))}
    </div>
  );
}