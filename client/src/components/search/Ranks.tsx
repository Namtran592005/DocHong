import Image from 'next/image';
import Link from 'next/link';

import { StatusPill } from '@/components/Badge';
import { CoverPlaceholder } from '@/components/CoverPlaceholder';
import { api, coverSrc } from '@/lib/api';
import {
  STATUS_LABEL,
  chapterCountHint,
  formatCount,
  mangaTitle,
  relativeTime,
} from '@/lib/format';
import type { Manga, MangaStatistics } from '@/lib/types';

interface RankedManga extends Manga {
  stats?: MangaStatistics;
}

export type { RankedManga };

function coverOf(manga: Manga, size = '.256.jpg') {
  const fileName = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes
    ?.fileName;
  return coverSrc(manga.id, fileName, size);
}

function Thumbnail({
  manga,
  className = '',
  eager = false,
}: {
  manga: Manga;
  className?: string;
  eager?: boolean;
}) {
  const src = coverOf(manga);
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="200px"
          loading={eager ? 'eager' : 'lazy'}
          className="object-cover"
        />
      ) : (
        <CoverPlaceholder />
      )}
    </div>
  );
}

/** Sao đầy theo thang điểm 10 của MangaDex. */
function Stars({ value }: { value: number }) {
  const filled = Math.round((value / 10) * 5);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          className={`size-3.5 ${index <= filled ? 'text-amber-400' : 'text-surface-3'}`}
          fill="currentColor"
        >
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.34 6.19 20.4 7.3 13.93 2.6 9.35l6.5-.95L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

function LoadMoreButton({ total, shown, onMore, loading }: {
  total: number;
  shown: number;
  onMore: () => void;
  loading: boolean;
}) {
  if (shown >= total) return null;
  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={onMore}
        disabled={loading}
        className="rounded-xl border border-line-strong px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        {loading ? 'Đang tải…' : `Xem thêm (${shown}/${total})`}
      </button>
    </div>
  );
}

/* ===================================================== 1. MỚI CẬP NHẬT */

/** Gom chương mới theo ngày để đọc như một dòng thời gian. */
function groupByDay(items: RankedManga[]) {
  const groups: { label: string; items: RankedManga[] }[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const manga of items) {
    const updated = new Date(manga.attributes.updatedAt).getTime();
    // MangaDex đôi khi ghi ngày cập nhật nằm trong tương lai; gộp vào "Hôm nay"
    // để nhóm hiển thị đúng trình tự thời gian.
    const days = Math.floor((startOfToday.getTime() - updated) / 86_400_000);

    let label: string;
    if (days <= 0) label = 'Hôm nay';
    else if (days === 1) label = 'Hôm qua';
    else if (days < 7) label = `${days} ngày trước`;
    else label = new Date(manga.attributes.updatedAt).toLocaleDateString('vi-VN');

    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(manga);
    else groups.push({ label, items: [manga] });
  }

  return groups;
}

export function RankLatest({ items, total, shown, onMore, loading }: RankListProps) {
  const groups = groupByDay(items);

  return (
    <>
      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.label}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-bold tracking-tight sm:text-lg">{group.label}</h2>
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-fg-subtle tabular-nums">{group.items.length}</span>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((manga, index) => (
                <li key={manga.id} className="min-w-0">
                  <Link
                    href={`/truyen/${manga.id}`}
                    className="group flex gap-3 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-accent"
                  >
                    <Thumbnail
                      manga={manga}
                      className="aspect-3/4 w-16 shrink-0 rounded-lg"
                      eager={index < 4}
                    />
                    <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                      <span className="line-clamp-2-safe text-sm leading-tight font-semibold break-words group-hover:text-accent">
                        {mangaTitle(manga)}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          status={manga.attributes.status}
                          label={STATUS_LABEL[manga.attributes.status]}
                        />
                        <span className="text-[11px] text-fg-subtle">
                          {relativeTime(manga.attributes.updatedAt)}
                        </span>
                      </span>
                      <span className="truncate text-[11px] text-fg-subtle">
                        {chapterCountHint(manga)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <LoadMoreButton total={total} shown={shown} onMore={onMore} loading={loading} />
    </>
  );
}

/* ================================================== 2. ĐƯỢC THEO DÕI NHIỀU */

/** Bảng xếp hạng: ba vị trí nhất nổi bật, phần còn lại đánh số. */
/** Màu kim loại của ba vị trí đầu: vàng, bạc, đồng. */
const MEDALS = [
  { medal: 'vàng', text: 'text-amber-500', ring: 'ring-amber-400/45', glow: 'shadow-[0_2px_18px_-6px_rgb(245_158_11/0.55)]' },
  { medal: 'bạc', text: 'text-slate-400', ring: 'ring-slate-300/45', glow: 'shadow-[0_2px_18px_-6px_rgb(148_163_184/0.5)]' },
  { medal: 'đồng', text: 'text-orange-700 dark:text-orange-500', ring: 'ring-orange-500/45', glow: 'shadow-[0_2px_18px_-6px_rgb(194_120_60/0.5)]' },
];

export function RankFollowed({ items, total, shown, onMore, loading }: RankListProps) {
  const [first, second, third, ...rest] = items;

  // Thứ nhất ở giữa và cao nhất, rồi bạc, rồi đồng
  const podium = [
    { manga: second, rank: 2 },
    { manga: first, rank: 1 },
    { manga: third, rank: 3 },
  ].filter((entry) => entry.manga);

  return (
    <>
      {/* Ba vị trí đầu — chỉ con số kim loại, không khối nền */}
      {podium.length > 0 && (
        <ul className="mb-8 grid min-w-0 grid-cols-3 items-end gap-2 sm:gap-5">
          {podium.map(({ manga, rank }) => {
            const tone = MEDALS[rank - 1];
            const isFirst = rank === 1;

            return (
              <li
                key={manga.id}
                className={`min-w-0 ${isFirst ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'} ${isFirst ? 'pb-6' : 'pb-2'}`}
              >
                <Link
                  href={`/truyen/${manga.id}`}
                  className="group flex flex-col items-center text-center"
                >
                  {/* Con số xếp hạng */}
                  <span
                    className={`font-brand text-5xl leading-none tabular-nums sm:text-7xl ${tone.text} ${tone.glow}`}
                    style={{ fontFamily: 'var(--font-display)' }}
                    aria-label={`Hạng ${rank}, ${tone.medal}`}
                  >
                    {rank}
                  </span>

                  <Thumbnail
                    manga={manga}
                    eager
                    className={`mt-2 aspect-3/4 w-full rounded-xl ring-2 ${tone.ring} ${
                      isFirst ? 'max-w-32' : 'max-w-24'
                    }`}
                  />

                  <span
                    className={`mt-2.5 line-clamp-2-safe font-semibold group-hover:text-accent ${
                      isFirst ? 'text-sm' : 'text-[13px]'
                    }`}
                  >
                    {mangaTitle(manga)}
                  </span>

                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-fg-subtle">
                    <svg
                      viewBox="0 0 24 24"
                      className={`size-3 ${tone.text}`}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 20s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.7 12 20 12 20Z" />
                    </svg>
                    {formatCount(manga.stats?.follows)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {rest.map((manga, index) => (
          <li key={manga.id}>
            <Link
              href={`/truyen/${manga.id}`}
              className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2 sm:px-4"
            >
              <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums text-fg-subtle">
                {index + 4}
              </span>
              <Thumbnail
                manga={manga}
                className="aspect-3/4 w-11 shrink-0 rounded-md"
                eager={index < 8}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-1 text-sm font-medium group-hover:text-accent">
                  {mangaTitle(manga)}
                </span>
                <span className="flex items-center gap-2 text-[11px] text-fg-subtle">
                  <span>{STATUS_LABEL[manga.attributes.status]}</span>
                  <span>·</span>
                  <span>{chapterCountHint(manga)}</span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums">
                  {formatCount(manga.stats?.follows)}
                </span>
                <span className="block text-[10px] text-fg-subtle">theo dõi</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <LoadMoreButton total={total} shown={shown} onMore={onMore} loading={loading} />
    </>
  );
}

/* ====================================================== 3. ĐÁNH GIÁ CAO */

/** Lưới thẻ điểm: điểm là thông tin chính nên đặt lên đầu thẻ. */
export function RankRating({ items, total, shown, onMore, loading }: RankListProps) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((manga, index) => {
          const average = manga.stats?.rating?.average ?? 0;

          return (
            <li key={manga.id} className="min-w-0">
              <Link
                href={`/truyen/${manga.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition hover:border-accent"
              >
                <span className="relative block aspect-3/4 overflow-hidden bg-surface-2">
                  <Thumbnail manga={manga} className="size-full" eager={index < 8} />
                  <span className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                    <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                      #{index + 1}
                    </span>
                    <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black tabular-nums">
                      {average ? average.toFixed(1) : '—'}
                    </span>
                  </span>
                </span>

                <span className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <span className="line-clamp-2-safe text-[13px] leading-tight font-semibold group-hover:text-accent">
                    {mangaTitle(manga)}
                  </span>

                  <span className="flex items-center justify-between gap-2">
                    <Stars value={average} />
                    <span className="text-[10px] text-fg-subtle tabular-nums">
                      {average ? average.toFixed(2) : '—'}/10
                    </span>
                  </span>

                  <span className="mt-auto flex items-center justify-between gap-2 text-[11px] text-fg-subtle">
                    <span className="truncate">{STATUS_LABEL[manga.attributes.status]}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatCount(manga.stats?.follows)} theo dõi
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <LoadMoreButton total={total} shown={shown} onMore={onMore} loading={loading} />
    </>
  );
}

export interface RankListProps {
  items: RankedManga[];
  total: number;
  shown: number;
  onMore: () => void;
  loading: boolean;
}

/** Gộp thống kê của các truyện vào, tối đa 100 id mỗi lần gọi. */
export async function attachStats(items: Manga[]): Promise<RankedManga[]> {
  if (items.length === 0) return [];
  const response = await api
    .statisticsBatch(items.map((manga) => manga.id))
    .catch(() => null);

  const table = response?.statistics ?? {};
  return items.map((manga) => ({ ...manga, stats: table[manga.id] }));
}