import Link from 'next/link';
import { Suspense } from 'react';

import { ContinueReading } from '@/components/library/ContinueReading';
import { RandomPick } from '@/components/library/RandomPick';
import { ActiveFilters } from '@/components/search/ActiveFilters';
import { GenreBrowser } from '@/components/search/GenreBrowser';
import { RankBoard } from '@/components/search/RankBoard';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { api } from '@/lib/api';
import { parseSearch, toQuery, type SearchParams } from '@/lib/search-params';
import { initRequestContext } from '@/lib/site';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await initRequestContext();

  const params = await searchParams;
  const search = parseSearch(params);

  const [tagResponse, firstPage] = await Promise.all([
    api.tags().catch(() => null),
    api.manga(toQuery(search, PAGE_SIZE, 0)).catch(() => null),
  ]);

  const tags = tagResponse?.data ?? [];
  const total = firstPage?.total ?? 0;

  if (search.view === 'genres') {
    return (
      <div className="container-page py-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Thể loại</h1>
        <GenreBrowser
          genreTags={tags.filter((tag) => tag.attributes.group === 'genre')}
          themeTags={tags.filter((tag) => tag.attributes.group === 'theme')}
          formatTags={tags.filter((tag) => tag.attributes.group === 'format')}
        />
      </div>
    );
  }

  // Vào thẳng bằng một cách sắp xếp mà không kèm bộ lọc nào thì dùng bố cục
  // xếp hạng riêng, thay vì giao diện tìm kiếm tổng quát.
  const isBareRanking =
    !search.title &&
    search.tags.length === 0 &&
    search.statuses.length === 0 &&
    search.demographics.length === 0 &&
    search.languages.length === 0 &&
    search.year === '' &&
    !search.hasChapters;

  if (isBareRanking) {
    const kind =
      search.orderBy === 'followedCount'
        ? 'followed'
        : search.orderBy === 'rating'
          ? 'rating'
          : 'latest';

    return (
      <div className="container-page py-6 sm:py-8">
        <RankBoard kind={kind} />
      </div>
    );
  }

  return (
    <div className="container-page py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {search.title ? `“${search.title}”` : 'Thư viện truyện'}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[268px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-112px)] lg:overflow-y-auto lg:pr-1">
          <Suspense fallback={null}>
            <SearchFilters tags={tags} total={total} />
          </Suspense>
        </aside>

        <div className="min-w-0 space-y-4">
          <Suspense fallback={null}>
            <ActiveFilters tags={tags} />
          </Suspense>

          <Suspense fallback={null}>
            <ContinueReading />
          </Suspense>

          <SearchResults
            initial={
              firstPage ?? {
                result: 'error',
                response: 'collection',
                data: [],
                limit: 0,
                offset: 0,
                total: 0,
              }
            }
            query={toQuery(search, PAGE_SIZE, 0)}
            pageSize={PAGE_SIZE}
            title={
              search.title
                ? `Kết quả cho “${search.title}”`
                : search.hasVietnamese
                  ? 'Truyện đã Việt hoá'
                  : 'Danh sách truyện'
            }
            error={!firstPage}
          />

          <Suspense fallback={null}>
            <RandomPick />
          </Suspense>
        </div>
      </div>
    </div>
  );
}