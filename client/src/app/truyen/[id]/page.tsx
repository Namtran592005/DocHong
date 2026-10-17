import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/Badge';
import { ReadActionBar } from '@/components/manga/ReadActionBar';
import { ChapterBrowser } from '@/components/manga/ChapterBrowser';
import { MangaGrid } from '@/components/MangaCard';
import { SectionHeading } from '@/components/ui';
import { api, coverSrc } from '@/lib/api';
import {
  LANGUAGE_VIETNAMESE,
  STATUS_LABEL,
  alternateTitles,
  chapterLabel,
  describeText,
  formatCount,
  hasVietnamese,
  languageLabel,
  mangaTitle,
  relationName,
  sortedLanguages,
} from '@/lib/format';
import { getSiteUrl, initRequestContext } from '@/lib/site';
import type { Manga, Relationship } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function loadManga(id: string): Promise<Manga | null> {
  try {
    const response = await api.mangaDetail(id);
    return response.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const manga = await loadManga(id);
  if (!manga) return { title: 'Không tìm thấy truyện' };

  const title = mangaTitle(manga);
  const description = describeText(manga.attributes.description).slice(0, 155);
  const cover = manga.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;
  const siteUrl = await getSiteUrl();
  const image = coverSrc(id, cover, '.512.jpg');

  return {
    title,
    description,
    alternates: { canonical: `/truyen/${id}` },
    openGraph: {
      title: `${title} — Đọc Hong`,
      description,
      type: 'article',
      images: image ? [`${siteUrl}${image}`] : undefined,
    },
  };
}

function relation(manga: Manga, type: string): Relationship | undefined {
  return manga.relationships?.find((rel) => rel.type === type);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 border-b border-line py-2.5 text-sm last:border-b-0">
      <dt className="w-32 shrink-0 text-fg-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-fg-muted">{value}</dd>
    </div>
  );
}

export default async function MangaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initRequestContext();
  const manga = await loadManga(id);
  if (!manga) notFound();

  const { attributes } = manga;
  const title = mangaTitle(manga);
  const altTitles = alternateTitles(manga);
  const cover = relation(manga, 'cover_art')?.attributes?.fileName;
  const vietnamese = hasVietnamese(manga);

  // Chỉ tải feed của bản Việt nếu có, nếu không mới lấy bản gốc
  const languages = sortedLanguages(attributes.availableTranslatedLanguages ?? []).slice(0, 12);
  const preferredLanguage = vietnamese ? LANGUAGE_VIETNAMESE : (languages[0] ?? '');

  const [feed, similar, stats] = await Promise.all([
    api
      .chapterFeed(id, preferredLanguage ? [preferredLanguage] : undefined, 100, 0)
      .catch(() => null),
    api.similarManga(id, 12).catch(() => null),
    api.statistics(id).catch(() => null),
  ]);

  const chapters = feed?.data ?? [];

  // MangaDex đôi khi liệt kê `vi` trong danh sách ngôn ngữ dịch nhưng thực tế
  // chưa có chương tiếng Việt nào. Vì vậy nhãn dựa trên dữ liệu chương thật.
  const vietnameseReady = vietnamese && chapters.length > 0;

  const follows = stats?.statistics?.[id]?.follows ?? 0;
  // MangaDex dùng thang điểm 10 và không trả số lượt bình chọn
  const ratingAverage = stats?.statistics?.[id]?.rating?.average;

  const genres = attributes.tags.filter((tag) => tag.attributes.group === 'genre');
  const themes = attributes.tags.filter((tag) => tag.attributes.group === 'theme');
  const formats = attributes.tags.filter((tag) => tag.attributes.group === 'format');

  const scanlationGroups = chapters
    .map((chapter) => chapter.relationships?.find((rel) => rel.type === 'scanlation_group'))
    .filter((group): group is Relationship => Boolean(group))
    .filter((group, index, all) => all.findIndex((item) => item.id === group.id) === index)
    .slice(0, 8);

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-fg-subtle">
        <Link href="/" className="hover:text-accent">Trang chủ</Link>
        <span>/</span>
        <Link href="/tim-kiem" className="hover:text-accent">Thư viện</Link>
        <span>/</span>
        <span className="truncate text-fg-muted">{title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="relative aspect-3/4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2 shadow-[var(--shadow-card)]">
            {cover ? (
              <Image
                src={coverSrc(id, cover, '.512.jpg')}
                alt={`Bìa truyện ${title}`}
                fill
                priority
                sizes="(max-width:1024px) 40vw, 268px"
                className="object-cover"
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {vietnameseReady ? (
              <span className="rounded-md bg-ok/12 px-2 py-0.5 text-[11px] font-semibold text-ok">
                Đã có bản Việt hoá
              </span>
            ) : (
              <span className="rounded-md bg-warn/14 px-2 py-0.5 text-[11px] font-semibold text-warn">
                {vietnamese ? 'Bản Việt còn đang được cập nhật' : 'Chưa có bản Việt'}
              </span>
            )}
            <StatusBadge status={attributes.status} label={STATUS_LABEL[attributes.status]} />
            {attributes.year && (
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                {attributes.year}
              </span>
            )}
            {ratingAverage !== undefined && ratingAverage > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-fg">
                <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.34 6.19 20.4 7.3 13.93 2.6 9.35l6.5-.95L12 2.5z" />
                </svg>
                {ratingAverage.toFixed(1)}/10
              </span>
            )}
            {follows > 0 && (
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                {formatCount(follows)} người theo dõi
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>

          {altTitles.length > 0 && (
            <div className="mt-2.5">
              <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                Tên gốc và tên khác
              </p>
              <p className="mt-1 text-sm text-fg-muted">{altTitles.join(' · ')}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...genres, ...themes, ...formats].map((tag) => (
              <Link
                key={tag.id}
                href={`/tim-kiem?tag=${tag.id}`}
                className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
              >
                {tag.attributes.name?.vi ?? tag.attributes.name?.en}
              </Link>
            ))}
          </div>

          <ReadActionBar manga={manga} firstChapter={chapters[0] ?? null} />

          <section className="mt-7">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-fg uppercase">Nội dung</h2>
            <div className="space-y-3 text-sm leading-relaxed text-fg-muted">
              {describeText(attributes.description)
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </section>

          <section className="mt-7">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-fg uppercase">Thông tin</h2>
            <dl className="card-surface px-4 py-1">
              <InfoRow label="Tác giả" value={relationName(relation(manga, 'author'))} />
              <InfoRow label="Hoạ sĩ" value={relationName(relation(manga, 'artist'))} />
              <InfoRow
                label="Tình trạng"
                value={`${STATUS_LABEL[attributes.status]}${
                  attributes.lastChapter ? ` · ${attributes.lastChapter}` : ''
                }${attributes.lastVolume ? ` · ${attributes.lastVolume}` : ''}`}
              />
              <InfoRow label="Ngôn ngữ gốc" value={languageLabel(attributes.originalLanguage)} />
              {attributes.publicationDemographic &&
                attributes.publicationDemographic !== 'none' && (
                  <InfoRow
                    label="Đối tượng"
                    value={attributes.publicationDemographic.toUpperCase()}
                  />
                )}
              <InfoRow
                label="Bản dịch có sẵn"
                value={languages.map(languageLabel).join(', ') || 'Chưa có bản dịch nào'}
              />
              <InfoRow
                label="Nhóm dịch"
                value={
                  scanlationGroups.length ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-1">
                      {scanlationGroups.map((group) => (
                        <span key={group.id} className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
                          {relationName(group)}
                        </span>
                      ))}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow label="Cập nhật" value={new Date(attributes.updatedAt).toLocaleDateString('vi-VN')} />
            </dl>
          </section>
        </div>
      </div>

      <section id="phan-chuong" className="mt-10 scroll-mt-24">
        <SectionHeading
          title="Danh sách chương"
          subtitle={
            vietnameseReady
              ? `${formatCount(feed?.total)} chương bản tiếng Việt`
              : `Chưa có chương bản tiếng Việt · ${formatCount(feed?.total)} chương`
          }
        />
        <ChapterBrowser mangaId={id} languages={languages} initialFeed={feed} />
      </section>

      {similar && similar.data.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title="Truyện cùng thể loại"
            subtitle={`Chia sẻ thể loại với ${title}`}
          />
          {/* Lưới này nằm cuối trang, nằm ngoài khung nhìn đầu nên để tải
              khi cuộn tới thay vì tải ngay. */}
          <MangaGrid items={similar.data} eagerCount={0} />
        </section>
      )}

      {/* Ghi công nhận nguồn — yêu cầu bắt buộc của chính sách MangaDex */}
      <p className="mt-10 rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-xs text-fg-subtle">
        Dữ liệu và bản dịch: MangaDex · Nhóm dịch: {scanlationGroups.map((group) => relationName(group)).join(', ') || '—'}
      </p>
    </div>
  );
}