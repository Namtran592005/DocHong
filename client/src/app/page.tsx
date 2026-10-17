import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { StatusBadge } from '@/components/Badge';
import { ContinueReading } from '@/components/library/ContinueReading';
import { RandomPick } from '@/components/library/RandomPick';
import {
  ShelfEmpty,
  ShelfError,
  ShelfLatest,
  ShelfTopFollowed,
  ShelfTopRated,
} from '@/components/home/Shelves';
import { api, coverSrc } from '@/lib/api';
import { STATUS_LABEL, describeText, mangaTitle } from '@/lib/format';
import { initRequestContext } from '@/lib/site';
import type { Manga } from '@/lib/types';

// Dữ liệu lấy từ proxy theo từng request, không render lúc build
export const dynamic = 'force-dynamic';

/** Chỉ lấy truyện đã có bản Việt hoá — đúng nhu cầu người đọc Việt. */
const VIETNAMESE = { hasVietnamese: true, hasChapters: true };

function Hero({ manga }: { manga: Manga }) {
  const { id, attributes } = manga;
  const title = mangaTitle(manga);
  const cover = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;

  const genres = attributes.tags
    .filter((tag) => tag.attributes.group === 'genre')
    .slice(0, 4)
    .map((tag) => tag.attributes.name?.vi ?? tag.attributes.name?.en)
    .filter(Boolean) as string[];

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-[11px] font-bold tracking-wide text-accent-fg uppercase">
              Nổi bật
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-ok/12 px-2 py-1 text-[11px] font-semibold text-ok">
              Đã Việt hoá
            </span>
            <StatusBadge status={attributes.status} label={STATUS_LABEL[attributes.status]} />
            {attributes.year && <span className="text-xs text-fg-subtle">{attributes.year}</span>}
          </div>

          <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            <Link href={`/truyen/${id}`} className="transition-colors hover:text-accent">
              {title}
            </Link>
          </h1>

          <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-[15px]">
            {describeText(attributes.description)}
          </p>

          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/tim-kiem?title=${encodeURIComponent(genre)}`}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {genre}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={`/truyen/${id}`}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Đọc truyện
            </Link>
            <Link
              href="/tim-kiem?sort=latestUploadedChapter"
              className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Truyện mới cập nhật
            </Link>
          </div>
        </div>

        <Link
          href={`/truyen/${id}`}
          className="relative hidden bg-surface-2 md:block"
          aria-label={title}
        >
          <div className="absolute inset-0">
            {cover ? (
              <Image
                src={coverSrc(id, cover, '.512.jpg')}
                alt={`Bìa truyện ${title}`}
                fill
                priority
                sizes="320px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent" />
        </Link>
      </div>
    </section>
  );
}

const SHELVES = [
  {
    key: 'latest',
    title: 'Mới cập nhật',
    subtitle: 'Chương Việt hoá mới được đăng gần đây nhất',
    href: '/tim-kiem?sort=latestUploadedChapter',
    orderBy: 'latestUploadedChapter',
    limit: 18,
  },
  {
    key: 'followed',
    title: 'Được theo dõi nhiều',
    subtitle: 'Bộ truyện đang được đông đảo độc giả quan tâm nhất',
    href: '/tim-kiem?sort=followedCount',
    orderBy: 'followedCount',
    limit: 10,
  },
  {
    key: 'rating',
    title: 'Đánh giá cao nhất',
    subtitle: 'Bộ truyện được cộng đồng chấm điểm tốt nhất',
    href: '/tim-kiem?sort=rating',
    orderBy: 'rating',
    limit: 10,
  },
] as const;

/** Tải cả ba kệ song song để chỉ phải chờ độ dài của kệ chậm nhất. */
async function loadShelves() {
  return Promise.all(
    SHELVES.map(async (shelf) => ({
      shelf,
      data: await api
        .manga({ ...VIETNAMESE, limit: shelf.limit, offset: 0, orderBy: shelf.orderBy })
        .then((response) => response.data ?? [])
        .catch(() => null),
    })),
  );
}

export default async function HomePage() {
  await initRequestContext();

  const [featuredResponse, tagResponse, shelves] = await Promise.all([
    api.manga({ ...VIETNAMESE, limit: 6, offset: 0, orderBy: 'followedCount' }).catch(() => null),
    api.tags().catch(() => null),
    loadShelves(),
  ]);

  const featured = featuredResponse?.data?.[0] ?? null;
  const genreTags = (tagResponse?.data ?? [])
    .filter((tag) => tag.attributes.group === 'genre')
    .slice(0, 10);

  const render = (key: string) => {
    const entry = shelves.find((item) => item.shelf.key === key);
    if (!entry) return null;
    const { shelf, data } = entry;

    if (!data) {
      return <ShelfError title={shelf.title} subtitle={shelf.subtitle} href={shelf.href} />;
    }
    if (data.length === 0) {
      return <ShelfEmpty title={shelf.title} subtitle={shelf.subtitle} href={shelf.href} />;
    }

    if (shelf.key === 'latest') return <ShelfLatest items={data} />;
    if (shelf.key === 'followed') return <ShelfTopFollowed items={data} />;
    return <ShelfTopRated items={data} />;
  };

  return (
    <div className="container-page space-y-10 py-6 sm:space-y-12 sm:py-8">
      {featured ? (
        <Hero manga={featured} />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-10 text-center">
          <p className="font-semibold">Chưa kết nối được thư viện truyện</p>
        </div>
      )}

      <Suspense fallback={null}>
        <ContinueReading />
      </Suspense>

      {render('latest')}
      {render('followed')}

      {genreTags.length > 0 && (
        <section>
          <div className="mb-4 border-b border-line pb-3">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Thể loại</h2>
            <p className="mt-0.5 text-xs text-fg-subtle sm:text-sm">
              Chọn thể loại để lọc nhanh hơn
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {genreTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tim-kiem?tag=${tag.id}`}
                className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                {tag.attributes.name?.vi ?? tag.attributes.name?.en}
              </Link>
            ))}
          </div>
        </section>
      )}

      {render('rating')}

      <Suspense fallback={null}>
        <RandomPick />
      </Suspense>
    </div>
  );
}